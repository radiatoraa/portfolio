/* Handmade page:
   1) reads the real shape of each picture so the black frame fits it exactly
   2) sticks the two pieces of tape on every frame, picking at random between
        tape-a = top-left + bottom-right   and   tape-b = top-right + bottom-left
      (and tilting each piece a tiny bit differently so it looks hand-stuck).
   Nothing to edit here when you add pictures. */
(function () {
  "use strict";
  Array.prototype.forEach.call(document.querySelectorAll(".piece"), function (piece) {
    if (!piece.classList.contains("tape-a") && !piece.classList.contains("tape-b")) {
      piece.classList.add(Math.random() < 0.5 ? "tape-a" : "tape-b");
    }
    piece.style.setProperty("--j1", (Math.random() * 12 - 6).toFixed(1) + "deg");
    piece.style.setProperty("--j2", (Math.random() * 12 - 6).toFixed(1) + "deg");
    var img = piece.querySelector(".pic img");
    if (!img) return;
    function set() {
      if (img.naturalWidth && img.naturalHeight) {
        piece.style.setProperty("--ar", (img.naturalWidth / img.naturalHeight).toFixed(4));
      }
    }
    if (img.complete) set(); else img.addEventListener("load", set);
  });
})();
