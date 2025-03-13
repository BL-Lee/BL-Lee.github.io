


function loadSideImages(imgData)
{
    blurbText = d3.select("#blurb");
    blurbs = blurbText.selectAll(".blurb-section").data(imgData);
    imgBlocks = d3.select("#blurb-images").selectAll("div")
	.data(imgData).enter().append("div");

    imgBlocks.selectAll("img").data(function (d, i){
	return imgData[i];
    }).enter().append("img")
	.attr("src", (d) => "../" + d.imgSrc)
	.attr("style", "max-width: 100px");
    
}


var complementaryImages = [
    [
	{
	    imgSrc: "img/AO.png",
	},
	{
	    imgSrc: "img/subdivision.png",
	},
	{
	    imgSrc: "img/similarity.png",
	}
    ],
    [
	{
	    imgSrc: "img/fracture_2.png",
	},
	{
	    imgSrc: "img/slime.png",
	}
    ]
];

loadSideImages(complementaryImages);
    var lastScrollTop = 0;
function setLoadingScrolls()
{
    var element = d3.select('#blurb');
    console.log(element.node().scrollTop);
    const sections = d3.selectAll(".blurb-section");
    console.log(sections);
    var offsets = Array(sections._groups[0].length);
    for (let i = 0; i < sections._groups[0].length; i++)
    {
	console.log(sections._groups[0][i].offsetHeight);
	offsets[i] = sections._groups[0][i].offsetHeight;
    }


    element = element.node();
    element.onscroll = (e)=>{
	if (element.scrollTop < lastScrollTop){
	    // upscroll 
	    return;
	}
	lastScrollTop = element.scrollTop <= 0 ? 0 : element.scrollTop;
	if (element.scrollTop + element.offsetHeight >= element.scrollHeight ){
	    console.log("End");
	}
	console.log(element.scrollTop);
    }
    
}
setLoadingScrolls();
