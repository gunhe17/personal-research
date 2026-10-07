(() => {
  const host = window.parent.workbench;
  const frame = window.frameElement;
  const bar = document.querySelector(".pane-bar");
  if (!host || !frame || !bar) return;
  bar.draggable = true;
  bar.addEventListener("dragstart", (e) => {
    e.dataTransfer.setData("application/x-research-tab", JSON.stringify({ group: frame.dataset.group, key: frame.dataset.key }));
    e.dataTransfer.effectAllowed = "move";
    host.dragStart();
  });
  bar.addEventListener("dragend", () => host.dragEnd());
  const close = document.createElement("button");
  close.type = "button";
  close.className = "pane-button";
  close.title = "닫기";
  close.setAttribute("aria-label", "닫기");
  close.textContent = "×";
  close.addEventListener("click", () => host.close(frame));
  bar.append(close);
  window.addEventListener("pointerdown", () => host.focus(frame), true);
})();
