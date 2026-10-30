/**
 * common.js - Thư viện tương tác dùng chung cho bộ Prototype IELTS
 * Quản lý cuộn mượt thanh điều hướng, đếm ngược đồng hồ, giới hạn lựa chọn và đánh dấu dẫn chứng
 */
(function() {
  // 1. Cuộn mượt đến câu hỏi mục tiêu
  function scrollToQuestion(questionNumber) {
    const el = document.getElementById(`question-${questionNumber}`) || document.querySelector(`[data-question="${questionNumber}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Hiệu ứng nhấp nháy định vị
      el.classList.add('ring-2', 'ring-[#932120]', 'ring-offset-2');
      setTimeout(() => {
        el.classList.remove('ring-2', 'ring-[#932120]', 'ring-offset-2');
      }, 1500);
    }
  }

  // 2. Bộ đếm ngược thời gian làm bài
  function initTimer(elementId, initialSeconds = 3600, onExpire) {
    const timerEl = document.getElementById(elementId);
    if (!timerEl) return;

    let remaining = initialSeconds;

    function update() {
      const mins = Math.floor(remaining / 60);
      const secs = remaining % 60;
      timerEl.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
      if (remaining <= 0) {
        clearInterval(interval);
        if (typeof onExpire === 'function') onExpire();
      }
      remaining--;
    }

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }

  // 3. Tăng giảm kích thước phông chữ văn bản bài đọc
  function initFontZoomer(targetContainerId, btnZoomInId, btnZoomOutId, btnResetId) {
    const container = document.getElementById(targetContainerId);
    if (!container) return;

    let currentSize = 16; // Cỡ chữ mặc định 16px (text-base)

    const btnIn = document.getElementById(btnZoomInId);
    const btnOut = document.getElementById(btnZoomOutId);
    const btnReset = document.getElementById(btnResetId);

    if (btnIn) {
      btnIn.addEventListener('click', () => {
        if (currentSize < 24) {
          currentSize += 2;
          container.style.fontSize = currentSize + 'px';
        }
      });
    }

    if (btnOut) {
      btnOut.addEventListener('click', () => {
        if (currentSize > 12) {
          currentSize -= 2;
          container.style.fontSize = currentSize + 'px';
        }
      });
    }

    if (btnReset) {
      btnReset.addEventListener('click', () => {
        currentSize = 16;
        container.style.fontSize = '';
      });
    }
  }

  // 4. Giới hạn số lượng lựa chọn cho dạng Checkbox Group (Type 4 và Type 8)
  function initCheckboxLimiter(containerSelector = '.checkbox-group-limiter') {
    const groups = document.querySelectorAll(containerSelector);
    groups.forEach(group => {
      const maxAllowed = parseInt(group.getAttribute('data-max-selection') || '2', 10);
      const checkboxes = group.querySelectorAll('input[type="checkbox"]');
      const counterEl = group.querySelector('.selection-counter');

      function updateCheckboxes() {
        const checked = group.querySelectorAll('input[type="checkbox"]:checked');
        const count = checked.length;

        if (counterEl) {
          counterEl.textContent = `${count}/${maxAllowed}`;
        }

        checkboxes.forEach(cb => {
          if (!cb.checked && count >= maxAllowed) {
            cb.disabled = true;
            cb.closest('label')?.classList.add('opacity-50', 'cursor-not-allowed');
          } else {
            cb.disabled = false;
            cb.closest('label')?.classList.remove('opacity-50', 'cursor-not-allowed');
          }
        });
      }

      checkboxes.forEach(cb => {
        cb.addEventListener('change', updateCheckboxes);
      });

      updateCheckboxes();
    });
  }

  // 5. Cụm 3 nút chuyển đổi trạng thái True / False / Not Given (Type 21 & 22)
  function initSegmentedControls() {
    const segmentedContainers = document.querySelectorAll('.segmented-control-group');
    segmentedContainers.forEach(container => {
      const buttons = container.querySelectorAll('button[data-value]');
      buttons.forEach(btn => {
        btn.addEventListener('click', function(e) {
          e.preventDefault();
          buttons.forEach(b => {
            b.classList.remove('bg-[#932120]', 'text-white', 'shadow-xs');
            b.classList.add('bg-white', 'text-zinc-700', 'hover:bg-zinc-100');
          });
          this.classList.remove('bg-white', 'text-zinc-700', 'hover:bg-zinc-100');
          this.classList.add('bg-[#932120]', 'text-white', 'shadow-xs');
        });
      });
    });
  }

  // 6. Liên kết tự động đánh dấu dẫn chứng trên bài đọc (Review Evidence Linking)
  function highlightEvidenceInPassage(paragraphId, quoteText) {
    const passageContainer = document.getElementById('passage-content-container');
    if (!passageContainer) return;

    // Xóa đánh dấu cũ
    const existing = passageContainer.querySelectorAll('.evidence-highlight');
    existing.forEach(el => {
      el.outerHTML = el.innerHTML;
    });

    if (!quoteText) return;

    // Tìm và bao bọc dẫn chứng bằng thẻ mark nổi bật
    const inner = passageContainer.innerHTML;
    const cleanQuote = quoteText.trim();
    if (inner.includes(cleanQuote)) {
      passageContainer.innerHTML = inner.replace(
        cleanQuote,
        `<mark class="evidence-highlight bg-amber-200 text-amber-950 font-medium px-1 rounded transition-all ring-2 ring-amber-400">${cleanQuote}</mark>`
      );

      const targetMark = passageContainer.querySelector('.evidence-highlight');
      if (targetMark) {
        targetMark.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }

  // Khởi tạo toàn cục
  window.IELTSProto = {
    scrollToQuestion,
    initTimer,
    initFontZoomer,
    initCheckboxLimiter,
    initSegmentedControls,
    highlightEvidenceInPassage
  };
})();
