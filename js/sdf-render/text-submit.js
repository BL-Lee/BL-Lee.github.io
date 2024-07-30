function submitString(textInfo, buffer, fontInfo, canvas )
{
    let stringBuffer = [];
    let string = textInfo.text;
    let initial = {x: ((textInfo.box.x / canvas.width) - 0.5)  * 2.0,
		   y: ((textInfo.box.bottom / canvas.height) - 0.5) * 2.0}; // scale to canvas
    console.log(textInfo.box);
    console.log(canvas.height);
    console.log(initial);
    let uvS = {x: 1 / fontInfo.atlas.width, y: 1 / fontInfo.atlas.height};
    let fontScale = textInfo.font.height * fontInfo.metrics.lineHeight / canvas.height; //TODO: get from screen resolution and window size
    for (var i = 0; i < string.length; i++)
    {
	//let c = string[i];
	let c = string.charCodeAt(i);
	let info = fontInfo.glyphs[c - 32];
	if (!info)
	{
	    continue;
	}
	if (info.planeBounds)
	{
	    //bottom left
	    stringBuffer.push(
		initial.x + info.planeBounds.left * fontScale, //Pos
		initial.y + info.planeBounds.bottom * fontScale, 0.0,
		info.atlasBounds.left * uvS.x, info.atlasBounds.bottom * uvS.y, //UV
		0.0,1.0,0.0, //colour
		
		initial.x + info.planeBounds.left * fontScale,
		initial.y + info.planeBounds.top * fontScale, 0.0,
		info.atlasBounds.left * uvS.x, info.atlasBounds.top * uvS.y, //UV
		0.0,0.0,0.0, //colour

		initial.x + info.planeBounds.right * fontScale,
		initial.y + info.planeBounds.top * fontScale, 0.0,
		info.atlasBounds.right * uvS.x, info.atlasBounds.top * uvS.y, //UV
		0.0,0.0,0.0, //colour

		initial.x + info.planeBounds.right * fontScale,
		initial.y + info.planeBounds.bottom * fontScale, 0.0,
		info.atlasBounds.right * uvS.x , info.atlasBounds.bottom * uvS.y, //UV
		0.0,0.0,0.0, //colour
	    );
	}

	initial.x += info.advance * fontScale;	
    }
    
    buffer = buffer.concat(stringBuffer);
    return buffer;
};


/*
  vec2 bl = font->charData[ch].location[0];
  vec2 tr = font->charData[ch].location[1];
  vec2 blV = location + font->charData[ch].planeBounds[0]*scale; //
  vec2 trV = location + font->charData[ch].planeBounds[1]*scale;//location + (tr - bl)*pixelHeight;
  Vertex a = {
    {blV.x,blV.y,layer},
    {0.0,1.0,0.0},
    {bl.x, bl.y}
  };
  Vertex b = {
    {blV.x,trV.y,layer},
    {0.0,1.0,0.0},
    {bl.x, tr.y}
  };
  Vertex c = {
    {trV.x,trV.y,layer},
    {0.0,1.0,0.0},
    {tr.x, tr.y}
  };
  Vertex d = {
    {trV.x,blV.y,layer},
    {0.0,1.0,0.0},
    {tr.x, bl.y}
  };


*/

export { submitString };
