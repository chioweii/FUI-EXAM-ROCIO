// CAMERA FEED
navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
  const video = document.getElementById("camera-feed");
  video.srcObject = stream;
});

// COUNTER
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
  circleMiddle.addEventListener("touchstart", function (e) {
    e.preventDefault();
    resetCounter();
  });
}

// ROTATION INTERACTION
const CIRCLE_ROTATION_BIG = document.querySelector(".circle-rotation-big");
const CIRCLE_ROTATION_SMALL = document.querySelector(".circle-rotation-small");
const video = document.querySelector("#circle video");

if (video) {
  video.pause();
  video.currentTime = 15;
}

let whenDragging = false;
let startAngle = 0;
let currentRotation = 0;
let videoRotation = 0; // Track continuous rotation for video

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

CIRCLE_ROTATION_BIG.addEventListener("touchstart", (e) => {
  whenDragging = true;
  CIRCLE_ROTATION_BIG.classList.add("grabbing");
  const center = getElementCenter(CIRCLE_ROTATION_BIG);
  const touch = e.touches[0];
  startAngle = getAngle(center.x, center.y, touch.clientX, touch.clientY);
});

CIRCLE_ROTATION_BIG.addEventListener("touchmove", (e) => {
  if (!whenDragging) return;
  e.preventDefault();

  const center = getElementCenter(CIRCLE_ROTATION_BIG);
  const touch = e.touches[0];
  const currentAngle = getAngle(
    center.x,
    center.y,
    touch.clientX,
    touch.clientY
  );

  const rotation = currentAngle - startAngle;
  videoRotation += rotation;
  currentRotation += rotation;
  // console.log("Big circle rotation (deg):", currentRotation);

  let prevRotation = currentRotation;
  currentRotation = ((currentRotation % 360) + 360) % 360;
  CIRCLE_ROTATION_BIG.style.transform = `rotate(${currentRotation}deg)`;

  if (video && video.duration) {
    // Use continuous rotation to avoid large seeks
    const loops = Math.floor(Math.abs(videoRotation) / 360);
    const normalizedRotation = ((videoRotation % 360) + 360) % 360;
    video.currentTime = (normalizedRotation / 360) * video.duration;
  }

  startAngle = currentAngle;
});

CIRCLE_ROTATION_BIG.addEventListener("touchend", () => {
  whenDragging = false;
  CIRCLE_ROTATION_BIG.classList.remove("grabbing");
});

// SMALL CIRCLE ROTATION

let whenDraggingSmall = false;
let startAngleSmall = 0;
let currentRotationSmall = 0;
let videoRotationSmall = 0; // Track continuous rotation for video

CIRCLE_ROTATION_SMALL.addEventListener("touchstart", (e) => {
  whenDraggingSmall = true;
  CIRCLE_ROTATION_SMALL.classList.add("grabbing");
  const center = getElementCenter(CIRCLE_ROTATION_SMALL);
  const touch = e.touches[0];
  startAngleSmall = getAngle(center.x, center.y, touch.clientX, touch.clientY);
});

CIRCLE_ROTATION_SMALL.addEventListener("touchmove", (e) => {
  if (!whenDraggingSmall) return;

  e.preventDefault();
  const center = getElementCenter(CIRCLE_ROTATION_SMALL);
  const touch = e.touches[0];
  const currentAngle = getAngle(
    center.x,
    center.y,
    touch.clientX,
    touch.clientY
  );

  const rotation = currentAngle - startAngleSmall;
  let prevRotationSmall = currentRotationSmall;
  videoRotationSmall += rotation;
  currentRotationSmall += rotation;

  currentRotationSmall = ((currentRotationSmall % 360) + 360) % 360;
  CIRCLE_ROTATION_SMALL.style.transform = `translate(-50%, -50%) rotate(${currentRotationSmall}deg)`;

  if (video && video.duration) {
    // Use continuous rotation to avoid large seeks
    const normalizedRotation = ((videoRotationSmall % 360) + 360) % 360;
    video.currentTime = (normalizedRotation / 360) * video.duration;

    if (
      Math.abs(rotation) > 0 &&
      prevRotationSmall % 360 > 300 &&
      currentRotationSmall < 60
    ) {
      updateCounter();
    }
  }

  startAngleSmall = currentAngle;
});

CIRCLE_ROTATION_SMALL.addEventListener("touchend", () => {
  whenDraggingSmall = false;
  CIRCLE_ROTATION_SMALL.classList.remove("grabbing");
});
