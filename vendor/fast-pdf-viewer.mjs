import { GlobalWorkerOptions, getDocument } from "./pdfjs-5.7.284-legacy/build/pdf.mjs";

GlobalWorkerOptions.workerSrc = new URL("./pdfjs-5.7.284-legacy/build/pdf.worker.mjs", import.meta.url).href;

const viewerContainer = document.getElementById("viewerContainer");
const viewer = document.getElementById("viewer");
const loadingMessage = document.getElementById("loadingMessage");
const errorMessage = document.getElementById("errorMessage");
const pageNumber = document.getElementById("pageNumber");
const pageCount = document.getElementById("pageCount");
const previousPageButton = document.getElementById("previousPageButton");
const nextPageButton = document.getElementById("nextPageButton");
const zoomOutButton = document.getElementById("zoomOutButton");
const zoomInButton = document.getElementById("zoomInButton");
const fitWidthButton = document.getElementById("fitWidthButton");
const zoomValue = document.getElementById("zoomValue");
const openFileButton = document.getElementById("openFileButton");

viewerContainer.dataset.parentZoomIsolation = "1";

const rawFile = new URLSearchParams(location.search).get("file") || "";
let fileUrl = null;
let pdfDocument = null;
let currentPage = 1;
let fitWidth = true;
let explicitScale = 1;
let renderGeneration = 0;
let resizeTimer = null;
const pageElements = new Map();
const visiblePages = new Set();
const renderTasks = new Map();
const MAX_OUTPUT_SCALE = 2;
const MAX_CANVAS_PIXELS = 8_000_000;
const viewportPageQuery = matchMedia("(max-width:1024px)");

function usesViewportPageSlots() {
  return viewportPageQuery.matches;
}

function hashPage() {
  const page = Number(new URLSearchParams(location.hash.slice(1)).get("page"));
  return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
}

function setStatus(message, isError=false) {
  loadingMessage.hidden = true;
  errorMessage.hidden = !isError;
  if (isError) errorMessage.textContent = message;
}

function updateControls() {
  pageNumber.value = String(currentPage);
  pageCount.textContent = pdfDocument ? String(pdfDocument.numPages) : "–";
  previousPageButton.disabled = !pdfDocument || currentPage <= 1;
  nextPageButton.disabled = !pdfDocument || currentPage >= pdfDocument.numPages;
  zoomValue.textContent = fitWidth ? "幅" : `${Math.round(explicitScale * 100)}%`;
}

function pageElement(number) {
  return pageElements.get(number) || null;
}

function outputScaleFor(viewport) {
  const deviceScale = Math.max(1, devicePixelRatio || 1);
  const cssPixels = Math.max(1, viewport.width * viewport.height);
  const areaScale = Math.sqrt(MAX_CANVAS_PIXELS / cssPixels);
  return Math.max(1, Math.min(deviceScale, MAX_OUTPUT_SCALE, areaScale));
}

function applyPageSize(element, canvas, width, height) {
  const cssWidth = Math.max(1, width);
  const cssHeight = Math.max(1, height);
  const pageWidth = usesViewportPageSlots() ? Math.max(cssWidth, viewerContainer.clientWidth) : cssWidth;
  const pageHeight = usesViewportPageSlots() ? Math.max(cssHeight, viewerContainer.clientHeight) : cssHeight;
  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${cssHeight}px`;
  element.style.width = `${pageWidth}px`;
  element.style.height = `${pageHeight}px`;
}

function scaleLoadedPages(factor) {
  if (!Number.isFinite(factor) || factor <= 0 || Math.abs(factor - 1) < .001) return;
  viewer.querySelectorAll(".page canvas").forEach(canvas => {
    const element = canvas.closest(".page");
    const width = Number.parseFloat(canvas.style.width);
    const height = Number.parseFloat(canvas.style.height);
    if (!element || !Number.isFinite(width) || !Number.isFinite(height)) return;
    applyPageSize(element, canvas, width * factor, height * factor);
  });
}

async function renderPage(number, force=false) {
  if (!pdfDocument || number < 1 || number > pdfDocument.numPages) return;
  const element = pageElement(number);
  if (!element) return;
  const targetGeneration = renderGeneration;
  if (!force && element.dataset.loaded === "true" && element.dataset.generation === String(targetGeneration)) return;

  const previousTask = renderTasks.get(number);
  if (previousTask) {
    try { previousTask.cancel(); } catch (_) {}
  }

  try {
    const page = await pdfDocument.getPage(number);
    if (targetGeneration !== renderGeneration) return;
    const baseViewport = page.getViewport({ scale:1 });
    const availableWidth = Math.max(120, viewerContainer.clientWidth - (innerWidth <= 480 ? 4 : 24));
    const scale = fitWidth ? availableWidth / baseViewport.width : explicitScale;
    const viewport = page.getViewport({ scale });
    // Retina端末では最大2倍で描画する。高倍率時だけキャンバス面積に応じて
    // 自動的に出力倍率を下げ、画質とメモリ使用量を両立する。
    const pixelRatio = outputScaleFor(viewport);
    const cssWidth = Math.max(1, Math.round(viewport.width));
    const cssHeight = Math.max(1, Math.round(viewport.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.floor(viewport.width * pixelRatio));
    canvas.height = Math.max(1, Math.floor(viewport.height * pixelRatio));
    const context = canvas.getContext("2d", { alpha:false });
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    const renderTask = page.render({
      canvasContext:context,
      viewport,
      transform:pixelRatio === 1 ? null : [pixelRatio,0,0,pixelRatio,0,0]
    });
    renderTasks.set(number, renderTask);
    await renderTask.promise;
    if (targetGeneration !== renderGeneration) return;
    applyPageSize(element, canvas, cssWidth, cssHeight);
    element.replaceChildren(canvas);
    element.dataset.loaded = "true";
    element.dataset.generation = String(targetGeneration);
    element.dataset.renderScale = String(scale);
    element.dataset.outputScale = String(pixelRatio);
  } catch (error) {
    if (error && error.name === "RenderingCancelledException") return;
    element.textContent = `p.${number} を表示できません`;
  } finally {
    renderTasks.delete(number);
  }
}

function createPages() {
  viewer.replaceChildren();
  pageElements.clear();
  for (let number=1; number<=pdfDocument.numPages; number += 1) {
    const element = document.createElement("div");
    element.className = "page";
    element.dataset.pageNumber = String(number);
    element.dataset.loaded = "false";
    if (usesViewportPageSlots()) {
      element.style.width = `${viewerContainer.clientWidth}px`;
      element.style.height = `${viewerContainer.clientHeight}px`;
    }
    pageElements.set(number, element);
    viewer.append(element);
    pageObserver.observe(element);
  }
}

function setCurrentPage(number, scroll=true) {
  if (!pdfDocument) return;
  currentPage = Math.min(pdfDocument.numPages, Math.max(1, Math.floor(Number(number) || 1)));
  updateControls();
  const element = pageElement(currentPage);
  const renderPromise = renderPage(currentPage);
  const alignPage = () => {
    if (!scroll || !element) return;
    viewerContainer.scrollTop = element.offsetTop;
  };
  alignPage();
  renderPromise.finally(() => requestAnimationFrame(alignPage));
  const hash = new URLSearchParams({ page:String(currentPage), zoom:fitWidth ? "page-width" : String(explicitScale) });
  history.replaceState(null, "", `#${hash}`);
}

function rerenderVisible() {
  renderGeneration += 1;
  for (const task of renderTasks.values()) {
    try { task.cancel(); } catch (_) {}
  }
  renderTasks.clear();
  const generation = renderGeneration;
  const primary = currentPage;
  const secondary = [...visiblePages].filter(number => number !== primary);
  // 操作中のページを最優先で高精細化し、前後ページはその後に処理する。
  updateControls();
  const primaryRender = renderPage(primary, true);
  return primaryRender.then(() => {
    if (generation !== renderGeneration) return;
    return Promise.all(secondary.map(number => renderPage(number, true)));
  });
}

let zoomLockedPage = null;
let zoomOperation = 0;

function captureZoomAnchor(point) {
  const containerRect = viewerContainer.getBoundingClientRect();
  const hit = document.elementFromPoint(containerRect.left + point.x, containerRect.top + point.y);
  const page = hit?.closest?.(".page") || pageElement(currentPage);
  if (!page) return null;
  const canvas = page.querySelector("canvas");
  const canvasRect = canvas?.getBoundingClientRect();
  const hitX = containerRect.left + point.x;
  const hitY = containerRect.top + point.y;
  const onCanvas = !!canvasRect &&
    hitX >= canvasRect.left && hitX <= canvasRect.right &&
    hitY >= canvasRect.top && hitY <= canvasRect.bottom;
  const target = onCanvas ? canvas : page;
  const targetRect = target.getBoundingClientRect();
  return {
    pageNumber:Number(page.dataset.pageNumber) || currentPage,
    target:onCanvas ? "canvas" : "page",
    ratioX:Math.min(1, Math.max(0, (hitX - targetRect.left) / Math.max(1, targetRect.width))),
    ratioY:Math.min(1, Math.max(0, (hitY - targetRect.top) / Math.max(1, targetRect.height))),
    point:{ x:point.x, y:point.y }
  };
}

function restoreZoomAnchor(anchor, point=anchor?.point) {
  if (!anchor || !point) return;
  const page = pageElement(anchor.pageNumber);
  const target = anchor.target === "canvas" ? page?.querySelector("canvas") : page;
  if (!page || !target) return;
  const containerRect = viewerContainer.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const contentLeft = viewerContainer.scrollLeft + targetRect.left - containerRect.left;
  const contentTop = viewerContainer.scrollTop + targetRect.top - containerRect.top;
  viewerContainer.scrollLeft = Math.max(0, contentLeft + targetRect.width * anchor.ratioX - point.x);
  viewerContainer.scrollTop = Math.max(0, contentTop + targetRect.height * anchor.ratioY - point.y);
}

function beginZoomLock(anchor) {
  const token = ++zoomOperation;
  if (anchor) {
    zoomLockedPage = anchor.pageNumber;
    currentPage = anchor.pageNumber;
    updateControls();
  }
  return token;
}

function finishZoomLock(token, anchor, point, renderPromise) {
  Promise.resolve(renderPromise).finally(() => requestAnimationFrame(() => {
    if (token !== zoomOperation) return;
    restoreZoomAnchor(anchor, point);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (token === zoomOperation) zoomLockedPage = null;
    }));
  }));
}

function setZoom(scale) {
  const baseScale = zoomBase();
  const targetScale = Math.min(4, Math.max(.35, scale));
  const factor = targetScale / baseScale;
  const point = {
    x:viewerContainer.clientWidth / 2,
    y:viewerContainer.clientHeight / 2
  };
  const anchor = captureZoomAnchor(point);
  const token = beginZoomLock(anchor);
  scaleLoadedPages(factor);
  fitWidth = false;
  explicitScale = targetScale;
  restoreZoomAnchor(anchor, point);
  finishZoomLock(token, anchor, point, rerenderVisible());
}

function zoomBase() {
  if (!fitWidth) return explicitScale;
  const renderedScale = Number(pageElement(currentPage)?.dataset.renderScale);
  return Number.isFinite(renderedScale) && renderedScale > 0 ? renderedScale : 1;
}

const pageObserver = new IntersectionObserver(entries => {
  for (const entry of entries) {
    const number = Number(entry.target.dataset.pageNumber);
    if (entry.isIntersecting) {
      visiblePages.add(number);
      renderPage(number);
    } else {
      visiblePages.delete(number);
    }
  }
}, { root:viewerContainer, rootMargin:"350px 0px", threshold:.01 });

let scrollFrame = null;
viewerContainer.addEventListener("scroll", () => {
  if (scrollFrame) cancelAnimationFrame(scrollFrame);
  scrollFrame = requestAnimationFrame(() => {
    scrollFrame = null;
    if (zoomLockedPage !== null) {
      if (currentPage !== zoomLockedPage) {
        currentPage = zoomLockedPage;
        updateControls();
      }
      return;
    }
    const containerRect = viewerContainer.getBoundingClientRect();
    let nearest = null;
    for (const [number, element] of pageElements) {
      const rect = element.getBoundingClientRect();
      if (rect.bottom <= containerRect.top || rect.top >= containerRect.bottom) continue;
      const distance = Math.abs(rect.top - containerRect.top);
      if (!nearest || distance < nearest.distance) nearest = { number, distance };
    }
    if (nearest && nearest.number !== currentPage) {
      currentPage = nearest.number;
      updateControls();
    }
  });
}, { passive:true });

previousPageButton.addEventListener("click", () => setCurrentPage(currentPage - 1));
nextPageButton.addEventListener("click", () => setCurrentPage(currentPage + 1));
pageNumber.addEventListener("change", () => setCurrentPage(pageNumber.value));
pageNumber.addEventListener("keydown", event => {
  if (event.key === "Enter") setCurrentPage(pageNumber.value);
});
zoomOutButton.addEventListener("click", () => setZoom(zoomBase() / 1.2));
zoomInButton.addEventListener("click", () => setZoom(zoomBase() * 1.2));
fitWidthButton.addEventListener("click", () => {
  const point = { x:viewerContainer.clientWidth / 2, y:viewerContainer.clientHeight / 2 };
  const anchor = captureZoomAnchor(point);
  const token = beginZoomLock(anchor);
  fitWidth = true;
  finishZoomLock(token, anchor, point, rerenderVisible());
});
openFileButton.addEventListener("click", () => fileUrl && window.open(fileUrl.href, "_blank"));

let pinchGesture = null;
const distance = touches => Math.hypot(
  touches[0].clientX - touches[1].clientX,
  touches[0].clientY - touches[1].clientY
);
const midpoint = touches => {
  const rect = viewerContainer.getBoundingClientRect();
  return {
    x:(touches[0].clientX + touches[1].clientX) / 2 - rect.left,
    y:(touches[0].clientY + touches[1].clientY) / 2 - rect.top
  };
};
function clearPinchPreview() {
  viewer.classList.remove("pinching");
  viewer.style.transform = "";
  viewer.style.transformOrigin = "";
}
function commitPinchGesture(gesture) {
  const factor = gesture.factor;
  const scaleChanged = Math.abs(factor - 1) > .01;

  if (scaleChanged) {
    // 指を離した瞬間に低解像度の拡大表示をレイアウトへ確定し、
    // その後PDF.jsの高精細キャンバスへ置き換える。表示の巻き戻りを防ぐ。
    scaleLoadedPages(factor);
  }

  clearPinchPreview();
  restoreZoomAnchor(gesture.anchor, gesture.point);

  if (scaleChanged) {
    fitWidth = false;
    explicitScale = gesture.targetScale;
    finishZoomLock(gesture.lockToken, gesture.anchor, gesture.point, rerenderVisible());
  } else {
    if (gesture.lockToken === zoomOperation) zoomLockedPage = null;
    updateControls();
  }
}
viewerContainer.addEventListener("touchstart", event => {
  if (event.touches.length !== 2 || !pdfDocument) return;
  const point = midpoint(event.touches);
  const baseScale = zoomBase();
  const anchor = captureZoomAnchor(point);
  const lockToken = beginZoomLock(anchor);
  pinchGesture = {
    startDistance:Math.max(1, distance(event.touches)),
    baseScale,
    factor:1,
    targetScale:baseScale,
    startPoint:point,
    point,
    anchor,
    lockToken,
    startScrollLeft:viewerContainer.scrollLeft,
    startScrollTop:viewerContainer.scrollTop,
    anchorContentX:viewerContainer.scrollLeft + point.x,
    anchorContentY:viewerContainer.scrollTop + point.y
  };
  viewer.classList.add("pinching");
  viewer.style.transformOrigin = "0 0";
  viewer.style.transform = "translate3d(0px, 0px, 0) scale(1)";
  if (event.cancelable) event.preventDefault();
}, { passive:false });
viewerContainer.addEventListener("touchmove", event => {
  if (event.touches.length !== 2 || !pinchGesture) return;
  const point = midpoint(event.touches);
  const rawFactor = distance(event.touches) / pinchGesture.startDistance;
  const targetScale = Math.min(4, Math.max(.35, pinchGesture.baseScale * rawFactor));
  const factor = targetScale / pinchGesture.baseScale;
  // ピンチ開始時に指の中心下にあったPDF座標を、現在の指の中心へ追従させる。
  const tx = point.x + pinchGesture.startScrollLeft - factor * pinchGesture.anchorContentX;
  const ty = point.y + pinchGesture.startScrollTop - factor * pinchGesture.anchorContentY;
  pinchGesture.factor = factor;
  pinchGesture.targetScale = targetScale;
  pinchGesture.point = point;
  viewer.style.transform = `translate3d(${tx}px, ${ty}px, 0) scale(${factor})`;
  zoomValue.textContent = `${Math.round(targetScale * 100)}%`;
  if (event.cancelable) event.preventDefault();
}, { passive:false });
viewerContainer.addEventListener("touchend", event => {
  if (event.touches.length >= 2 || !pinchGesture) return;
  const gesture = pinchGesture;
  pinchGesture = null;
  commitPinchGesture(gesture);
  if (event.cancelable) event.preventDefault();
}, { passive:false });
viewerContainer.addEventListener("touchcancel", () => {
  if (!pinchGesture) return;
  const gesture = pinchGesture;
  pinchGesture = null;
  clearPinchPreview();
  if (gesture.lockToken === zoomOperation) {
    zoomOperation += 1;
    zoomLockedPage = null;
  }
  updateControls();
}, { passive:true });

addEventListener("hashchange", () => setCurrentPage(hashPage()));
new ResizeObserver(() => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => fitWidth && rerenderVisible(), 140);
}).observe(viewerContainer);

async function start() {
  try {
    if (!rawFile) throw new Error("PDFファイルが指定されていません。");
    fileUrl = new URL(rawFile, location.href);
    if (fileUrl.origin !== location.origin) throw new Error("同一サイトのPDFのみ表示できます。");
    const assetRoot = new URL("./pdfjs-5.7.284-legacy/web/", import.meta.url).href;
    const loadingTask = getDocument({
      url:fileUrl.href,
      cMapUrl:`${assetRoot}cmaps/`,
      cMapPacked:true,
      iccUrl:`${assetRoot}iccs/`,
      standardFontDataUrl:`${assetRoot}standard_fonts/`,
      wasmUrl:`${assetRoot}wasm/`
    });
    loadingTask.onProgress = progress => {
      if (progress.total) loadingMessage.textContent = `PDFを読み込み中… ${Math.min(100, Math.round(progress.loaded / progress.total * 100))}%`;
    };
    pdfDocument = await loadingTask.promise;
    pageCount.textContent = String(pdfDocument.numPages);
    createPages();
    currentPage = Math.min(pdfDocument.numPages, hashPage());
    updateControls();
    await renderPage(currentPage, true);
    loadingMessage.hidden = true;
    setCurrentPage(currentPage);
  } catch (error) {
    setStatus(error && error.message ? error.message : "PDFを表示できませんでした。", true);
  }
}

start();
