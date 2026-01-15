// ==============================
// LOADING SCREEN
// ==============================
const loadingScreen = document.getElementById("loading-screen");

function hideLoadingScreen() {
  loadingScreen.classList.add("hidden");
}

loadingScreen.addEventListener("click", hideLoadingScreen);
loadingScreen.addEventListener(
  "touchstart",
  function (e) {
    e.preventDefault();
    hideLoadingScreen();
  },
  { passive: false }
);

// ==============================
// CAMERA FEED
// ==============================
navigator.mediaDevices
  .getUserMedia({ video: true })
  .then((stream) => {
    const cam = document.getElementById("camera-feed");
    cam.srcObject = stream;
  })
  .catch((err) => {
    console.log("Camera error:", err);
  });

// ==============================
// COUNTER
// ==============================
const counterSpan = document.querySelector(".counter");
let loopCount = 0;

function updateCounter() {
  loopCount++;
  counterSpan.textContent = loopCount.toString().padStart(2, "0");
}

function resetCounter() {
  loopCount = 0;
  counterSpan.textContent = "00";
}

const circleMiddle = document.querySelector(".circle-middle");
if (circleMiddle) {
  circleMiddle.addEventListener("click", resetCounter);
  circleMiddle.addEventListener(
    "touchstart",
    function (e) {
      e.preventDefault();
      resetCounter();
    },
    { passive: false }
  );
}

// ==============================
// VIDEO SCRUBBING SETUP
// ==============================
const video = document.getElementById("scrub-video");

// iOS Safari likes a tiny time offset, and hates seeking exactly at 0 or duration
const SEEK_EPS = 0.04;

function wrapTime(t, duration) {
  // Wrap between 0 and duration
  t = ((t % duration) + duration) % duration;

  // Avoid exact endpoints (reduces glitches on iOS)
  if (t < SEEK_EPS) t = SEEK_EPS;
  if (t > duration - SEEK_EPS) t = duration - SEEK_EPS;

  return t;
}

function seekSafely(t) {
  if (!video || !video.duration) return;

  const safe = wrapTime(t, video.duration);

  // fastSeek is sometimes smoother (Safari)
  if (typeof video.fastSeek === "function") {
    video.fastSeek(safe);
  } else {
    video.currentTime = safe;
  }
}

// Start at a stable frame
if (video) {
  video.pause();

  // When metadata is loaded, set a stable starting time
  video.addEventListener("loadedmetadata", () => {
    seekSafely(Math.min(15, video.duration * 0.2));
  });
}

// ==============================
// ROTATION MATH HELPERS
// ==============================
function getElementCenter(element) {
  const rect = element.getBoundingClientRect();
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}

function getAngle(cx, cy, ex, ey) {
  const dy = ey - cy;
  const dx = ex - cx;
  return Math.atan2(dy, dx) * (180 / Math.PI);
}

// IMPORTANT: normalize delta to avoid jump at 359->0
function normalizeDeltaAngle(delta) {
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  return delta;
}

// ==============================
// POINTER-BASED ROTATION (smooth on iPad)
// ==============================
const rotationContainer = document.querySelector(".circle-rotation");
const ringBig = document.querySelector(".circle-rotation-big");
const ringSmall = document.querySelector(".circle-rotation-small");

let draggingBig = false;
let draggingSmall = false;

let lastAngleBig = 0;
let lastAngleSmall = 0;

let rotationBig = 0;
let rotationSmall = 0;

// For loop counting: keep accumulated rotation direction
let totalSmallRotation = 0;

// Sensitivity: small ring = precise, big ring = coarse
const BIG_SENSITIVITY = 1.0;
const SMALL_SENSITIVITY = 1.0;

function pointerAngleOnRing(ring, clientX, clientY) {
  const center = getElementCenter(ring);
  return getAngle(center.x, center.y, clientX, clientY);
}

function applyRotationUI() {
  ringBig.style.transform = `rotate(${rotationBig}deg)`;
  ringSmall.style.transform = `translate(-50%, -50%) rotate(${rotationSmall}deg)`;
}

function scrubVideoByDeltaDegrees(deltaDeg, sensitivity = 1) {
  if (!video || !video.duration) return;

  const deltaTime = (deltaDeg / 360) * video.duration * sensitivity;
  seekSafely(video.currentTime + deltaTime);
}

function startDragBig(e) {
  draggingBig = true;
  rotationContainer.classList.add("grabbing");
  ringBig.setPointerCapture(e.pointerId);
  lastAngleBig = pointerAngleOnRing(ringBig, e.clientX, e.clientY);
}

function startDragSmall(e) {
  draggingSmall = true;
  rotationContainer.classList.add("grabbing");
  ringSmall.setPointerCapture(e.pointerId);
  lastAngleSmall = pointerAngleOnRing(ringSmall, e.clientX, e.clientY);
}

function moveDragBig(e) {
  if (!draggingBig) return;

  const currentAngle = pointerAngleOnRing(ringBig, e.clientX, e.clientY);
  let deltaDeg = currentAngle - lastAngleBig;
  deltaDeg = normalizeDeltaAngle(deltaDeg);

  rotationBig = (rotationBig + deltaDeg) % 360;
  if (rotationBig < 0) rotationBig += 360;

  applyRotationUI();

  // ✅ Smooth scrubbing without jump
  scrubVideoByDeltaDegrees(deltaDeg, BIG_SENSITIVITY);

  lastAngleBig = currentAngle;
}

function moveDragSmall(e) {
  if (!draggingSmall) return;

  const currentAngle = pointerAngleOnRing(ringSmall, e.clientX, e.clientY);
  let deltaDeg = currentAngle - lastAngleSmall;
  deltaDeg = normalizeDeltaAngle(deltaDeg);

  rotationSmall = (rotationSmall + deltaDeg) % 360;
  if (rotationSmall < 0) rotationSmall += 360;

  applyRotationUI();

  // ✅ Smooth scrubbing without jump
  scrubVideoByDeltaDegrees(deltaDeg, SMALL_SENSITIVITY);

  // ✅ Accurate "full loop" counting
  totalSmallRotation += deltaDeg;

  // Count every time we pass +360 in the positive direction
  while (totalSmallRotation >= 360) {
    totalSmallRotation -= 360;
    updateCounter();
  }

  // If you also want reverse loops to decrement, uncomment:
  // while (totalSmallRotation <= -360) {
  //   totalSmallRotation += 360;
  //   loopCount = Math.max(0, loopCount - 1);
  //   counterSpan.textContent = loopCount.toString().padStart(2, "0");
  // }

  lastAngleSmall = currentAngle;
}

function endDrag(e) {
  draggingBig = false;
  draggingSmall = false;
  rotationContainer.classList.remove("grabbing");

  try {
    ringBig.releasePointerCapture(e.pointerId);
  } catch {}
  try {
    ringSmall.releasePointerCapture(e.pointerId);
  } catch {}
}

// ==============================
// Attach pointer events
// ==============================

// Big ring
ringBig.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  startDragBig(e);
});

ringBig.addEventListener("pointermove", (e) => {
  e.preventDefault();
  moveDragBig(e);
});

ringBig.addEventListener("pointerup", endDrag);
ringBig.addEventListener("pointercancel", endDrag);

// Small ring
ringSmall.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  startDragSmall(e);
});

ringSmall.addEventListener("pointermove", (e) => {
  e.preventDefault();
  moveDragSmall(e);
});

ringSmall.addEventListener("pointerup", endDrag);
ringSmall.addEventListener("pointercancel", endDrag);
