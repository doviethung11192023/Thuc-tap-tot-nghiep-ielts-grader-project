/**
 * splitter.js - Bộ điều khiển thanh trượt phân chia tỷ lệ hai cột (30% - 70%)
 * Thiết kế cho giao diện phòng thi IELTS Reading Workspace
 */
(function() {
  function initSplitter(containerId, leftId, resizerId, rightId) {
    const container = document.getElementById(containerId);
    const leftPane = document.getElementById(leftId);
    const resizer = document.getElementById(resizerId);
    const rightPane = document.getElementById(rightId);

    if (!container || !leftPane || !resizer || !rightPane) return;

    let isDragging = false;

    resizer.addEventListener('mousedown', function(e) {
      isDragging = true;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    });

    document.addEventListener('mousemove', function(e) {
      if (!isDragging) return;

      const containerRect = container.getBoundingClientRect();
      const pointerRelativeX = e.clientX - containerRect.left;
      let leftPercent = (pointerRelativeX / containerRect.width) * 100;

      // Giới hạn trong khoảng an toàn từ 30% đến 70%
      if (leftPercent < 30) leftPercent = 30;
      if (leftPercent > 70) leftPercent = 70;

      const rightPercent = 100 - leftPercent;

      leftPane.style.width = leftPercent + '%';
      rightPane.style.width = rightPercent + '%';
    });

    document.addEventListener('mouseup', function() {
      if (isDragging) {
        isDragging = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    });
  }

  window.initSplitter = initSplitter;
})();
