var allJson = {
    text:[]
};
function add_text_element(element)
{
    let data = {};
    data.text = element.textContent;
    let styleData = window.getComputedStyle(element);
    data.font = {
	height: parseInt(styleData.height),
	size: parseInt(styleData.fontSize),
	family: styleData["font-family"],
	weight: styleData["font-weight"],
    }
    
    data.colour = styleData.color;
    data.box = element.getBoundingClientRect();
    allJson.text.push(data);
    console.log(data);    
}

function add_element(element)
{

    switch(element.nodeName)
    {
	case("P"):
	case("H1"):
	case("H2"):
	case("H3"):
	case("H4"):
	{
	    add_text_element(element);
	}break;
	default:
	console.log(element.nodeName);	
    }
}

function get_webpage_json(){
    var elements = document.getElementsByTagName("*");

    for (var i=0, max=elements.length; i < max; i++) {
	add_element(elements[i]);
    }

    function download(content, fileName, contentType) {
	var a = document.createElement("a");
	var file = new Blob([content], {type: contentType});
	a.href = URL.createObjectURL(file);
	a.download = fileName;
	a.click();
    }
    //download(JSON.stringify(allJson), 'json.txt', 'text/plain');
}
get_webpage_json();
