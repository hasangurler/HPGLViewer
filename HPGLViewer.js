document.addEventListener('DOMContentLoaded', function() {
  // Page elements.
  const header = document.querySelector('#header');
  const footer = document.querySelector('#footer');
  const messageBox = document.getElementById("messageBox");
  const messageBoxCloseButton = document.getElementsByClassName("messagebox-close")[0];
  const messageBoxCaption = document.querySelector('#messageBoxCaption');
  const messageBoxText = document.querySelector('#messageBoxText');
  const canvas = document.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  
  // Global variables.
  let color = "white";
  let scale = 1;
  let offsetX = 0;
  let offsetY = 0;
  let mouseLeftButton = false;
  let mouseRightButton = false;
  let previousPos;
  let startPos;
  let endPos;
  let canvasPadding = getPadding(canvas);
  let fileName = "";

  let paths = {
    pathCount: 0,
    totalPointCount: 0,
    colorCode: [],
    pointCounts: [],
    x: [],
    y: []
  };
  
  let origin = {
    pathCount: 0,
    totalPointCount: 0,
    colorCode: [],
    pointCounts: [],
    x: [],
    y: []
  };

  getOrigin();

  // Page layout.
  canvas.height = window.innerHeight - header.offsetHeight - footer.offsetHeight - 55;
  canvas.width = header.offsetWidth - canvasPadding * 2;

  // Event lstener for resizing.
  window.addEventListener('resize', function(e) {
    canvas.height = window.innerHeight - header.offsetHeight - footer.offsetHeight - 55;
    canvas.width = header.offsetWidth - canvasPadding * 2;
    fitToScreen();
  }, true);

  // Event listeners for opening a file.
  const fileOpenButton = document.getElementById('file-input');

  document.querySelector('#open-file-button').onclick = () => {
    fileOpenButton.click();
  }

  fileOpenButton.addEventListener('change', readFile, false);

  // Read the file.
  function readFile(e) {
    let file = e.target.files[0];
    fileName = file.name;

    if (!file) {
      return;
    }

    // View only HPGL or PLT files.
    let fileNameParameters = file.name.split('.');
    let fileExtension = fileNameParameters[fileNameParameters.length - 1].toUpperCase();
    
    if (fileExtension === "HPGL" || fileExtension === "PLT") {
      document.querySelector('#file-name-header').innerHTML = "HPGL Viewer - " + file.name;

      let reader = new FileReader();
      reader.readAsText(file);
      
      reader.onload = function(e) {
        let contents = e.target.result;
        getPaths(contents);
        fitToScreen();
      };
    }
    else {
      let message = fileExtension + " files are not supported.";
      message += " Only HPGL and PLT files can be viewed!";
      messageBoxText.innerHTML = message;
      messageBoxCaption.innerHTML = "Warning!";
      messageBox.style.paddingTop = (canvas.height / 2).toString() + "px";
      messageBox.style.display = "block";
    }

    fileOpenButton.value = null;
  }

  // When the user clicks on (x) button on the message box, close it.
  messageBoxCloseButton.onclick = function() {
    messageBox.style.display = "none";
  }

  // When the user clicks anywhere outside of the messge box, close it.
  window.onclick = function(event) {
    if (event.target == messageBox) {
      messageBox.style.display = "none";
    }
  }

  // Get mouse position relative to canvas.
  function getMousePos(canvas, e) {
    let rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left - canvasPadding,
      y: e.clientY - rect.top - canvasPadding
    };
  }

  // Get padding value of an HTML item.
  function getPadding(item)
  {
    let paddingString = window.getComputedStyle(item, null).getPropertyValue('padding');
    let paddingStringWithoutPx = paddingString.substring(0,paddingString.length - 2);
    return parseInt(paddingStringWithoutPx);
  }

  // Mouse wheel event.
  canvas.addEventListener('wheel', function(e) {
    let oldScale = scale;

    if (e.deltaY < 0) {
      // Zoom in.
		  scale /= 1.1;
    }
    else {
      // Zoom out.
		  scale *= 1.1;
    }

    let pos = getMousePos(canvas, e);
    pos.y = canvas.height - pos.y;
    offsetX = pos.x - (pos.x - offsetX) * oldScale / scale;
    offsetY = pos.y - (pos.y - offsetY) * oldScale / scale;

    draw();
  })

  // Mouse double click event.
  canvas.ondblclick = () => {
    fitToScreen();
  }

  // Mouse down event.
  canvas.onmousedown = e => {
    if (e.button === 0) {
      // Mouse left button is down.
      mouseLeftButton = true;
      previousPos = getMousePos(canvas, e);
    }
    else if (e.button === 2) {
      // Mouse right button is down.
      mouseRightButton = true;
	    startPos = getMousePos(canvas, e);
	    endPos = startPos;
    }
  }

  // Mouse up event.
  canvas.onmouseup = e => {
    if (e.button === 0) {
      // Mouse left button is up.
      mouseLeftButton = false;
    }
    else if (e.button === 2) {
      // Mouse right button is up.
      mouseRightButton = false;

      // Pan zoom.
      if (startPos != endPos) {
        let x1,x2,y1,y2;

        if (startPos.x < endPos.x) {
          x1 = startPos.x;
          x2 = endPos.x;
        }
        else {
          x1 = endPos.x;
          x2 = startPos.x;
        }

        if(startPos.y < endPos.y) {
          y1 = startPos.y;
          y2 = endPos.y;
        }
        else {
          y1 = endPos.y;
          y2 = startPos.y;
        }

        let zoomWidth = x2 - x1;
        let zoomHeight = y2 - y1;
        let scaleX = canvas.width / zoomWidth;
        let scaleY = canvas.height / zoomHeight;
        let oldScale = scale;

        if(scaleX < scaleY)
        {
          scale /= scaleX;
        }
        else
        {
          scale /= scaleY;
        }

        offsetX = ((x1 - offsetX) * oldScale / scale) * -1;
        offsetY = ((canvas.height - y1 - offsetY) * oldScale / scale) * -1 + canvas.height;
        draw();
      }
    }
  }

  // Mouse move event.
  canvas.onmousemove = e => {
    if (fileName === "") {
      return;
    }

    let pos = getMousePos(canvas, e);

    if (mouseLeftButton === true) {
      // Mouse is moving while mouse left button is down.
      offsetX += pos.x - previousPos.x;
			offsetY -= pos.y - previousPos.y;
      previousPos = pos;
			draw();
    }
    else if (mouseRightButton === true) {
      // Mouse is moving while mouse right button is down.
      draw();
      ctx.beginPath();
      ctx.strokeStyle = "plum";
			ctx.moveTo(startPos.x, startPos.y);
			ctx.lineTo(pos.x, startPos.y);
			ctx.lineTo(pos.x, pos.y);
			ctx.lineTo(startPos.x, pos.y);
			ctx.lineTo(startPos.x, startPos.y);
      ctx.stroke();
			endPos = pos;
    }
  }
  
  // Disable the context menu opened by mouse right click.
  canvas.oncontextmenu = e => {
    e.preventDefault();
  }

  // CAD utilities.
  function getPaths(contents) {
    let lines = contents.split('\n');
    let currentColorCode = 0;
    paths.totalPointCount = 0;
    paths.pathCount = 0;

    for (let i = 0; i < lines.length; i++)
    {
      let line = lines[i];
      let parms = line.split(/[PUDNSFL,;]/);
      
      if (line[0] === 'S' && line[1] === 'P')
      {
        currentColorCode = parms[2];
      }
      else if (line[0] === 'P' && line[1] === 'U' && line[2] != ';')
      {
        let x = parseInt(parms[2]);
        let y = parseInt(parms[3]);

        paths.pathCount++;
        paths.x[paths.totalPointCount] = x;
        paths.y[paths.totalPointCount++] = y;
        paths.pointCounts[paths.pathCount - 1] = 1;
        paths.colorCode[paths.pathCount - 1] = currentColorCode;
      }
      else if (line[0] === 'P' && line[1] === 'D' && line[2] != ';')
      {
        let x = parseInt(parms[2]);
        let y = parseInt(parms[3]);
        
        paths.x[paths.totalPointCount] = x;
        paths.y[paths.totalPointCount++] = y;
        paths.pointCounts[paths.pathCount - 1]++;
      }
    }
  }

  function fitToScreen() {
    let minX = paths.x[0];
    let minY = paths.y[0];
    let maxX = minX;
    let maxY = minY;

    for (let i = 1; i < paths.totalPointCount; i++)
    {
      if (paths.x[i] < minX) {
        minX = paths.x[i];
      }
      else if (paths.x[i] > maxX) {
        maxX = paths.x[i];
      }

      if (paths.y[i] < minY) {
        minY = paths.y[i];
      }
      else if (paths.y[i] > maxY) {
        maxY = paths.y[i];
      }
    }

    for (let i = 1; i < origin.totalPointCount; i++)
    {
      if (origin.x[i] < minX) {
        minX = origin.x[i];
      }
      else if (origin.x[i] > maxX) {
        maxX = origin.x[i];
      }

      if (origin.y[i] < minY) {
        minY = origin.y[i];
      }
      else if (origin.y[i] > maxY) {
        maxY = origin.y[i];
      }
    }

    let dx = maxX - minX;
		let dy = maxY - minY;

		let sx = dx / (canvas.width - 100);
		let sy = dy / (canvas.height - 100);

		if(sx > sy)
		{
			scale = sx;
			offsetX = (-minX / scale) + 50;
			offsetY = (canvas.height / 2) + (dy / (2 * scale)) - (maxY / scale);
		}
		else
		{
			scale = sy;
			offsetX = (canvas.width / 2) - (dx / (2 * scale)) - (minX / scale);
			offsetY = (-minY / scale) + 50;
		}

    draw();
  }

  // Prepare the origin coordinates which indicates the X and Y axis.
  function getOrigin() {
    origin.x[0] = 0;
    origin.y[0] = 10000;
    origin.x[1] = 0;
    origin.y[1] = 0;
    origin.x[2] = 10000;
    origin.y[2] = 0;
    origin.colorCode[0] = 0;
    origin.pointCounts[0] = 3;

    origin.x[3] = -500;
    origin.y[3] = 9000;
    origin.x[4] = 0;
    origin.y[4] = 10000;
    origin.x[5] = +500;
    origin.y[5] = 9000;
    origin.colorCode[1] = 0;
    origin.pointCounts[1] = 3;

    origin.x[6] = 9000;
    origin.y[6] = 500;
    origin.x[7] = 10000;
    origin.y[7] = 0;
    origin.x[8] = 9000;
    origin.y[8] = -500;
    origin.colorCode[2] = 0;
    origin.pointCounts[2] = 3;

    origin.x[9] = -1000;
    origin.y[9] = 10000;
    origin.x[10] = -1500;
    origin.y[10] = 9200;
    origin.x[11] = -2000;
    origin.y[11] = 10000;
    origin.colorCode[3] = 0;
    origin.pointCounts[3] = 3;

    origin.x[12] = -1500;
    origin.y[12] = 9200;
    origin.x[13] = -1500;
    origin.y[13] = 8000;
    origin.colorCode[4] = 0;
    origin.pointCounts[4] = 2;

    origin.x[14] = 10000;
    origin.y[14] = -1000;
    origin.x[15] = 9000;
    origin.y[15] = -3000;
    origin.colorCode[5] = 0;
    origin.pointCounts[5] = 2;

    origin.x[16] = 9000;
    origin.y[16] = -1000;
    origin.x[17] = 10000;
    origin.y[17] = -3000;
    origin.colorCode[6] = 0;
    origin.pointCounts[6] = 2;

    origin.totalPointCount = 18;
    origin.pathCount = 7;
  }

  function draw() {
    // Clear drawing area.
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw origin.
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    let index = 0;
    
    for (let p = 0; p < origin.pathCount; p++)
    {
      ctx.beginPath();
      ctx.strokeStyle = selectColor(origin.colorCode[p]);
      let px = origin.x[index] / scale + offsetX;
      let py = origin.y[index++] / scale + offsetY;
      py = canvas.height - py;
      ctx.moveTo(px, py);
      
      for (let k = 1; k < origin.pointCounts[p]; k++)
      {
        px = origin.x[index] / scale + offsetX;
        py = origin.y[index++] / scale + offsetY;
        py = canvas.height - py;
        ctx.lineTo(px, py);
      }

      ctx.stroke();
    }

    // Draw paths.
    index = 0;

    for (let p = 0; p < paths.pathCount; p++)
    {
      ctx.beginPath();
      ctx.strokeStyle = selectColor(paths.colorCode[p]);
      let px = paths.x[index] / scale + offsetX;
      let py = paths.y[index++] / scale + offsetY;
      py = canvas.height - py;
      ctx.moveTo(px, py);
      
      for (let k = 1; k < paths.pointCounts[p]; k++)
      {
        px = paths.x[index] / scale + offsetX;
        py = paths.y[index++] / scale + offsetY;
        py = canvas.height - py;
        ctx.lineTo(px, py);
      }

      ctx.stroke();
    }
  }

  function selectColor(colorCode) {
    if (colorCode === '1') {
      return "lightgreen";
    }
    else if (colorCode === '2') {
      return "purple";
    }
    else if (colorCode === '3') {
      return "yellow";
    }
    else if (colorCode === '4') {
      return "skyblue";
    }
    else if (colorCode === '5') {
      return "deepskyblue";
    }
    else if (colorCode === '6') {
      return "blue";
    }
    else if (colorCode === '7') {
      return "orange";
    }
    else if (colorCode === '8') {
      return "salmon";
    }
    else if (colorCode === '9') {
      return "red";
    }
    else if (colorCode === '10') {
      return "tan";
    }
    else {
      return "white";
    }
  }
})