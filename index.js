const dropArea = document.getElementById('drop-area');
const fileElem = document.getElementById('file-elem');
const previewContainer = document.getElementById('preview-container');
const preview = document.getElementById('preview');
const downloadBtn = document.getElementById('download-btn');
const copyBtn = document.getElementById('copy-btn');
const pngResizeBtn = document.getElementById('png-resize-btn');

// Tuning Parameters Sliders
const paramColors = document.getElementById('param-colors');
const paramBlur = document.getElementById('param-blur');
const valColors = document.getElementById('val-colors');
const valBlur = document.getElementById('val-blur');

// Vector SVG Settings
const sizeRadios = document.getElementsByName('size-spec');
const customW = document.getElementById('custom-w');
const customH = document.getElementById('custom-h');

// PNG Resize Settings & Layout Policies
const pngPolicyRadios = document.getElementsByName('png-policy');
const pngW = document.getElementById('png-w');
const pngH = document.getElementById('png-h');

let svgString = '';
let currentFile = null;

let imageAspectRatio = 1.0;
let originalWidth = 800;
let originalHeight = 600;

const DEFAULT_PROMPT = "Click to select or drop an image file here to start";

// ==========================================
// 1. Controls Listeners & Dynamic Hot Reload
// ==========================================
paramColors.addEventListener('input', (e) => {
  valColors.innerText = e.target.value;
  if (currentFile) processImage(currentFile);
});

paramBlur.addEventListener('input', (e) => {
  valBlur.innerText = e.target.value;
  if (currentFile) processImage(currentFile);
});

sizeRadios.forEach(radio => {
  radio.addEventListener('change', () => {
    if (currentFile) processImage(currentFile);
  });
});

[customW, customH].forEach(input => {
  input.addEventListener('change', () => {
    const activeRadio = document.querySelector('input[name="size-spec"]:checked').value;
    if (activeRadio === 'custom' && currentFile) processImage(currentFile);
  });
});

pngPolicyRadios.forEach(radio => {
  radio.addEventListener('change', (e) => {
    if (e.target.value === 'proportional' && pngW.value) {
      const w = parseInt(pngW.value);
      if (w > 0) pngH.value = Math.round(w / imageAspectRatio);
    }
  });
});

pngW.addEventListener('input', () => {
  if (!currentFile || !pngW.value) return;
  const policy = document.querySelector('input[name="png-policy"]:checked').value;
  if (policy !== 'proportional') return;
  
  const w = parseInt(pngW.value);
  if (w > 0) {
    pngH.value = Math.round(w / imageAspectRatio);
  }
});

pngH.addEventListener('input', () => {
  if (!currentFile || !pngH.value) return;
  const policy = document.querySelector('input[name="png-policy"]:checked').value;
  if (policy !== 'proportional') return;
  
  const h = parseInt(pngH.value);
  if (h > 0) {
    pngW.value = Math.round(h * imageAspectRatio);
  }
});

dropArea.addEventListener('click', () => fileElem.click());
fileElem.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) { currentFile = file; processImage(file); }
});

// ==========================================
// 2. Drag & Drop Engine
// ==========================================
['dragenter', 'dragover'].forEach(eventName => {
  dropArea.addEventListener(eventName, (e) => {
    e.preventDefault(); 
    e.stopPropagation();
    dropArea.classList.add('dragover');
  }, false);
});

['dragleave', 'drop'].forEach(eventName => {
  dropArea.addEventListener(eventName, (e) => {
    e.preventDefault(); 
    e.stopPropagation();
    dropArea.classList.remove('dragover');
  }, false);
});

dropArea.addEventListener('drop', (e) => {
  e.preventDefault(); 
  e.stopPropagation();
  dropArea.classList.remove('dragover');
  
  const dt = e.dataTransfer;
  const files = dt.files;
  if (files && files.length > 0) {
    const file = files[0];
    if (file.type.startsWith('image/')) {
      currentFile = file;
      processImage(file);
    } else {
      alert('Please drop a valid image file!');
    }
  }
});

// ==========================================
// 3. Dynamic XML Attributes Parser for SVG Dimensions
// ==========================================
function finalizeSvgDimensions(rawSvg) {
  const selectedSize = document.querySelector('input[name="size-spec"]:checked').value;
  let targetWidth = '';
  let targetHeight = '';

  if (selectedSize === 'responsive') return rawSvg;
  else if (selectedSize === '800x640') { targetWidth = '800'; targetHeight = '640'; }
  else if (selectedSize === '1280x800') { targetWidth = '1280'; targetHeight = '800'; }
  else if (selectedSize === 'custom') {
    targetWidth = customW.value || '500';
    targetHeight = customH.value || '500';
  }

  let processed = rawSvg.replace(/<svg([^>]*)\bwidth="[^"]*"/i, '<svg$1width="' + targetWidth + 'px"');
  processed = processed.replace(/<svg([^>]*)\bheight="[^"]*"/i, '<svg$1height="' + targetHeight + 'px"');
  
  if (!processed.includes(`width="${targetWidth}px"`)) {
    processed = processed.replace('<svg', `<svg width="${targetWidth}px" height="${targetHeight}px"`);
  }
  return processed;
}

// ==========================================
// 4. Processing Engine Core (Vector Generation)
// ==========================================
function processImage(file) {
  svgString = '';
  dropArea.innerHTML = '<span class="loading-text">⚡ Engineering mathematical nodes...</span>';

  if (typeof ImageTracer === 'undefined') {
    alert("Error: Core conversion math library uninitialized.");
    dropArea.innerText = DEFAULT_PROMPT;
    return;
  }

  try {
    const imgUrl = URL.createObjectURL(file);
    const tempImg = new Image();
    tempImg.src = imgUrl;
    
    tempImg.onload = function() {
      originalWidth = tempImg.naturalWidth || tempImg.width || 800;
      originalHeight = tempImg.naturalHeight || tempImg.height || 600;
      imageAspectRatio = originalWidth / originalHeight;

      if (!pngW.value && !pngH.value) {
        pngW.value = originalWidth;
        pngH.value = originalHeight;
      }

      const colorsVal = parseInt(paramColors.value);
      const blurVal = parseInt(paramBlur.value);

      const tracerOptions = {
        numberofcolors: colorsVal,
        minaround: blurVal,
        ltres: 1,
        qtres: 1,
        viewbox: true
      };

      ImageTracer.imageToSVG(imgUrl, function(rawStr) {
        svgString = finalizeSvgDimensions(rawStr);
        
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const blobUrl = URL.createObjectURL(svgBlob);
        
        // 确保 UI 容器被正确刷出
        preview.src = blobUrl;
        previewContainer.style.display = 'block';
        dropArea.innerText = DEFAULT_PROMPT; 
        
        URL.revokeObjectURL(imgUrl);
      }, tracerOptions);
    };

  } catch (error) {
    console.error(error);
    alert('Vectorization failed: ' + error.message);
    dropArea.innerText = DEFAULT_PROMPT;
  }
}

// ==========================================
// 5. Output Mechanics (Download Actions)
// ==========================================
downloadBtn.addEventListener('click', () => {
  if (!svgString) return;
  chrome.downloads.download({
    url: 'data:image/svg+xml;utf8,' + encodeURIComponent(svgString),
    filename: 'pure_vector_output.svg',
    saveAs: true
  });
});

copyBtn.addEventListener('click', () => {
  if (!svgString) return;
  navigator.clipboard.writeText(svgString).then(() => {
    const originalText = copyBtn.innerText;
    copyBtn.innerText = "✓ Source Code Copied!";
    copyBtn.style.backgroundColor = "#e2e8f0";
    setTimeout(() => {
      copyBtn.innerText = originalText;
      copyBtn.style.backgroundColor = "#f1f5f9";
    }, 1200);
  });
});

pngResizeBtn.addEventListener('click', () => {
  if (!svgString) {
    alert("Please upload and convert an image first.");
    return;
  }

  const outW = parseInt(pngW.value) || originalWidth;
  const outH = parseInt(pngH.value) || originalHeight;
  const policy = document.querySelector('input[name="png-policy"]:checked').value;

  pngResizeBtn.innerText = "Rendering PNG...";
  pngResizeBtn.disabled = true;

  const img = new Image();
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const blobUrl = URL.createObjectURL(svgBlob);

  img.src = blobUrl;
  img.onload = function() {
    const canvas = document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, outW, outH);

    let dx = 0, dy = 0, dWidth = outW, dHeight = outH;

    if (policy === 'fixed-padding') {
      const canvasRatio = outW / outH;
      if (imageAspectRatio > canvasRatio) {
        dWidth = outW;
        dHeight = outW / imageAspectRatio;
        dy = (outH - dHeight) / 2;
      } else {
        dHeight = outH;
        dWidth = outH * imageAspectRatio;
        dx = (outW - dWidth) / 2;
      }
    } else {
      dx = 0; dy = 0; dWidth = outW; dHeight = outH;
    }

    ctx.drawImage(img, dx, dy, dWidth, dHeight);

    const pngDataUrl = canvas.toDataURL('image/png');
    
    chrome.downloads.download({
      url: pngDataUrl,
      filename: `resized_${policy}_${outW}x${outH}.png`,
      saveAs: true
    }, () => {
      pngResizeBtn.innerText = "🎯 Smart Render & Download PNG";
      pngResizeBtn.disabled = false;
      URL.revokeObjectURL(blobUrl);
    });
  };

  img.onerror = function(err) {
    console.error("Canvas rasterizer breakdown:", err);
    alert("Failed to render rasterized PNG frame.");
    pngResizeBtn.innerText = "🎯 Smart Render & Download PNG";
    pngResizeBtn.disabled = false;
    URL.revokeObjectURL(blobUrl);
  };
});