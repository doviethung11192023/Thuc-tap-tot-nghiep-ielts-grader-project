/**
 * common.js - Thư viện tương tác dùng chung cho bộ Prototype IELTS (LongDesign)
 * Chuẩn hóa 100% theo hành vi thực tế của Next.js/React trên worktree LongRevert
 */
(function() {
  // 1. Cuộn mượt đến câu hỏi mục tiêu
  function scrollToQuestion(questionNumber) {
    const el = document.getElementById(`question-${questionNumber}`) || document.querySelector(`[data-question="${questionNumber}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Hiệu ứng nhấp nháy định vị viền đỏ PTIT #932120
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
  function initFontZoomer(targetContainerId, btnZoomInId, btnZoomOutId, btnResetId, displayElId) {
    const container = document.getElementById(targetContainerId);
    if (!container) return;

    let currentSize = 17; // Cỡ chữ mặc định chuẩn LongRevert: 17px
    const displayEl = displayElId ? document.getElementById(displayElId) : null;

    const btnIn = document.getElementById(btnZoomInId);
    const btnOut = document.getElementById(btnZoomOutId);
    const btnReset = document.getElementById(btnResetId);

    function updateDisplay() {
      if (displayEl) {
        displayEl.textContent = `${currentSize}px`;
      }
      container.style.fontSize = `${currentSize}px`;
    }

    if (btnIn) {
      btnIn.addEventListener('click', () => {
        if (currentSize < 22) {
          currentSize += 1;
          updateDisplay();
        }
      });
    }

    if (btnOut) {
      btnOut.addEventListener('click', () => {
        if (currentSize > 14) {
          currentSize -= 1;
          updateDisplay();
        }
      });
    }

    if (btnReset) {
      btnReset.addEventListener('click', () => {
        currentSize = 17;
        updateDisplay();
      });
    }

    updateDisplay();
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
  function initSegmentedControls(onSelectionChange) {
    const segmentedContainers = document.querySelectorAll('.segmented-control-group');
    segmentedContainers.forEach(container => {
      const buttons = container.querySelectorAll('button[data-value]');
      buttons.forEach(btn => {
        btn.addEventListener('click', function(e) {
          e.preventDefault();
          const qNum = container.getAttribute('data-question');
          const value = this.getAttribute('data-value');
          buttons.forEach(b => {
            b.classList.remove('bg-[#932120]', 'text-white', 'shadow-xs');
            b.classList.add('bg-white', 'text-zinc-700', 'hover:bg-zinc-100');
          });
          this.classList.remove('bg-white', 'text-zinc-700', 'hover:bg-zinc-100');
          this.classList.add('bg-[#932120]', 'text-white', 'shadow-xs');

          if (typeof onSelectionChange === 'function' && qNum) {
            onSelectionChange(qNum, value);
          }
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

    if (paragraphId) {
      const paraEl = document.getElementById(`para-${paragraphId}`) || document.getElementById(paragraphId);
      if (paraEl) {
        paraEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        paraEl.classList.add('bg-amber-50', 'ring-2', 'ring-amber-400');
        setTimeout(() => {
          paraEl.classList.remove('bg-amber-50', 'ring-2', 'ring-amber-400');
        }, 2000);
      }
    }

    if (!quoteText) return;

    // Tìm và bao bọc dẫn chứng bằng thẻ mark nổi bật
    const cleanQuote = quoteText.trim();
    if (passageContainer.innerHTML.includes(cleanQuote)) {
      passageContainer.innerHTML = passageContainer.innerHTML.replace(
        cleanQuote,
        `<mark class="evidence-highlight bg-amber-200 text-amber-950 font-semibold px-1 rounded transition-all ring-2 ring-amber-400">${cleanQuote}</mark>`
      );

      const targetMark = passageContainer.querySelector('.evidence-highlight');
      if (targetMark) {
        targetMark.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }

  // 7. Quản lý Modal Popup (Xác nhận nộp bài, Thoát phòng thi)
  function openModal(modalId) {
    const m = document.getElementById(modalId);
    if (m) m.classList.remove('hidden');
  }

  function closeModal(modalId) {
    const m = document.getElementById(modalId);
    if (m) m.classList.add('hidden');
  }

  // 8. Chuyển đổi tab trong Accordion Lời Giải Chi Tiết 4 Bước
  function switchExplanationTab(buttonEl, tabType) {
    const accordionEl = buttonEl.closest('.explanation-accordion-box');
    if (!accordionEl) return;

    const btnExplanation = accordionEl.querySelector('.tab-btn-explanation');
    const btnLocation = accordionEl.querySelector('.tab-btn-location');
    const contentExplanation = accordionEl.querySelector('.tab-content-explanation');
    const contentLocation = accordionEl.querySelector('.tab-content-location');

    if (tabType === 'explanation') {
      btnExplanation?.classList.add('bg-white', 'text-blue-900', 'shadow-2xs');
      btnExplanation?.classList.remove('text-blue-600', 'hover:bg-blue-100/50');
      btnLocation?.classList.remove('bg-white', 'text-blue-900', 'shadow-2xs');
      btnLocation?.classList.add('text-blue-600', 'hover:bg-blue-100/50');

      contentExplanation?.classList.remove('hidden');
      contentLocation?.classList.add('hidden');
    } else {
      btnLocation?.classList.add('bg-white', 'text-blue-900', 'shadow-2xs');
      btnLocation?.classList.remove('text-blue-600', 'hover:bg-blue-100/50');
      btnExplanation?.classList.remove('bg-white', 'text-blue-900', 'shadow-2xs');
      btnExplanation?.classList.add('text-blue-600', 'hover:bg-blue-100/50');

      contentLocation?.classList.remove('hidden');
      contentExplanation?.classList.add('hidden');
    }
  }

  // Toggle thu gọn/mở rộng Accordion Giải Thích
  function toggleExplanationAccordion(headerButtonEl) {
    const accordionEl = headerButtonEl.closest('.explanation-accordion-box');
    if (!accordionEl) return;
    const bodyEl = accordionEl.querySelector('.explanation-accordion-body');
    const chevronEl = accordionEl.querySelector('.accordion-chevron-icon');

    if (bodyEl) {
      const isHidden = bodyEl.classList.contains('hidden');
      if (isHidden) {
        bodyEl.classList.remove('hidden');
        chevronEl?.classList.add('rotate-180');
      } else {
        bodyEl.classList.add('hidden');
        chevronEl?.classList.remove('rotate-180');
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
    highlightEvidenceInPassage,
    openModal,
    closeModal,
    switchExplanationTab,
    toggleExplanationAccordion
  };
})();
