/**
 * drag-drop-map.js - Bộ tương tác kéo thả bản đồ tọa độ IELTS Listening (Type 35)
 * Hỗ trợ đồng thời thao tác kéo thả chuột và phương thức chạm chọn (Click-to-Place)
 */
(function() {
  function initDragDropMap(config) {
    const {
      containerId,
      optionsContainerId,
      onAnswerChange,
      initialAnswers = {}
    } = config;

    const container = document.getElementById(containerId);
    const optionsContainer = document.getElementById(optionsContainerId);
    if (!container || !optionsContainer) return;

    let selectedOptionChar = null;
    const currentAnswers = { ...initialAnswers };

    // Khởi tạo các thẻ kéo thả bên cột phải
    const optionCards = optionsContainer.querySelectorAll('.draggable-option-card');
    optionCards.forEach(card => {
      card.setAttribute('draggable', 'true');

      // Sự kiện kéo chuột
      card.addEventListener('dragstart', function(e) {
        const char = this.getAttribute('data-char');
        e.dataTransfer.setData('text/plain', char);
        e.dataTransfer.effectAllowed = 'copy';
        this.classList.add('opacity-50');
      });

      card.addEventListener('dragend', function() {
        this.classList.remove('opacity-50');
      });

      // Hỗ trợ chế độ chạm chọn (Click-to-Place)
      card.addEventListener('click', function() {
        const char = this.getAttribute('data-char');
        if (selectedOptionChar === char) {
          // Bỏ chọn nếu nhấp lại
          selectedOptionChar = null;
          optionCards.forEach(c => c.classList.remove('ring-2', 'ring-blue-600', 'bg-blue-50'));
        } else {
          selectedOptionChar = char;
          optionCards.forEach(c => c.classList.remove('ring-2', 'ring-blue-600', 'bg-blue-50'));
          this.classList.add('ring-2', 'ring-blue-600', 'bg-blue-50');
        }
      });
    });

    // Khởi tạo các điểm ghim tọa độ trên ảnh bản đồ
    const dropTargets = container.querySelectorAll('.map-drop-target');
    dropTargets.forEach(target => {
      const qNum = target.getAttribute('data-question-number');

      target.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        this.classList.add('scale-110', 'ring-4', 'ring-blue-400');
      });

      target.addEventListener('dragleave', function() {
        this.classList.remove('scale-110', 'ring-4', 'ring-blue-400');
      });

      target.addEventListener('drop', function(e) {
        e.preventDefault();
        this.classList.remove('scale-110', 'ring-4', 'ring-blue-400');
        const char = e.dataTransfer.getData('text/plain');
        if (char) {
          assignAnswer(qNum, char);
        }
      });

      // Nhấp chọn vào điểm ghim khi đang kích hoạt phương thức chạm chọn
      target.addEventListener('click', function(e) {
        if (selectedOptionChar) {
          assignAnswer(qNum, selectedOptionChar);
          selectedOptionChar = null;
          optionCards.forEach(c => c.classList.remove('ring-2', 'ring-blue-600', 'bg-blue-50'));
        } else if (currentAnswers[qNum]) {
          // Nếu đã có đáp án mà nhấp vào thì xóa đáp án
          removeAnswer(qNum);
        }
      });
    });

    function assignAnswer(questionNumber, char) {
      currentAnswers[questionNumber] = char;
      renderPins();
      if (typeof onAnswerChange === 'function') {
        onAnswerChange(questionNumber, char);
      }
    }

    function removeAnswer(questionNumber) {
      delete currentAnswers[questionNumber];
      renderPins();
      if (typeof onAnswerChange === 'function') {
        onAnswerChange(questionNumber, null);
      }
    }

    function renderPins() {
      dropTargets.forEach(target => {
        const qNum = target.getAttribute('data-question-number');
        const val = currentAnswers[qNum];

        if (val) {
          // Trạng thái đã điền: Hiển thị huy hiệu xanh kép
          target.innerHTML = `
            <div class="flex items-center gap-1 bg-blue-600 text-white font-bold px-2 py-0.5 rounded-full shadow-lg border-2 border-white text-xs cursor-pointer hover:bg-blue-700 transition-transform hover:scale-105">
              <span>${qNum}</span>
              <span class="w-4 h-4 rounded-full bg-white text-blue-700 flex items-center justify-center font-black text-[10px]">${val}</span>
            </div>
          `;
          target.classList.remove('bg-slate-900', 'text-white');
        } else {
          // Trạng thái chờ: Hiển thị vòng tròn số câu hỏi
          target.innerHTML = `
            <div class="w-7 h-7 rounded-full bg-slate-900/90 text-white font-bold flex items-center justify-center border-2 border-white shadow-md text-xs cursor-pointer hover:bg-blue-600 transition-colors">
              ${qNum}
            </div>
          `;
        }
      });

      // Cập nhật trạng thái các thẻ bên phải (làm mờ thẻ đã chọn)
      const usedChars = Object.values(currentAnswers);
      optionCards.forEach(card => {
        const char = card.getAttribute('data-char');
        if (usedChars.includes(char)) {
          card.classList.add('opacity-40', 'border-dashed');
        } else {
          card.classList.remove('opacity-40', 'border-dashed');
        }
      });
    }

    // Kết xuất ban đầu
    renderPins();

    return {
      getAnswers: () => currentAnswers,
      setAnswers: (newAns) => {
        Object.assign(currentAnswers, newAns);
        renderPins();
      }
    };
  }

  window.initDragDropMap = initDragDropMap;
})();
