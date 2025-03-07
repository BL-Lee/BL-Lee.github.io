/*

      <div class="project-section" id="project-section">
    <div class="project-block">
	<div class='img-overlay'>
	  <a href="" class="project-title">Thesis: Ambient Occlusion</a>
	  <img src="img/AO.png" class='project-img'>
	</div>
      </div>

*/

var projectData = [
    {
	title : "Thesis: Ambient Occlusion",
	imgSrc: "img/AO.png",
	link: "#"
    },
    {
	title : "Thesis: Subdivision Surfaces",
	imgSrc: "img/subdivision.png",
	link: "#"
    },
    {
	title : "Thesis: Similar Mesh Retrieval",
	imgSrc: "img/similarity.png",
	link: "#"
    },
    {
	title : "Thesis: Brittle Fracture",
	imgSrc: "img/fracture_2.png",
	link: "#"
    },
    {
	title : "Slime Mold Simulation",
	imgSrc: "img/slime.png",
	link: "webgpu_example.html"
    },
    {
	title : "Vulkan Game Engine",
	imgSrc: "img/ray.bmp",
	link: "#"
    },
    {
	title : "Nokia Game Jam Submission",
	imgSrc: "img/bugburger.png",
	link: "https://limemonkeys.itch.io/bunger-burger-bistro"
    },
    {
	title : "Spotify Recommender",
	imgSrc: "img/spotifytemp.png",
	link: "#"
    },
    {
	title : "SIMD Ray Tracer",
	imgSrc: "img/ray.bmp",
	link: "#"
    },
    {
	title : "Low Effort Game Jam Submission",
	imgSrc: "img/fishJam.jpg",
	link: "#"
    },
    {
	title : "Boid Island",
	imgSrc: "vis/IslandFinal.mp4",
	link: "#"
    }
    
    

];


function loadSquares()
{
    let section = d3.select("#project-section");

    let blocks = section.selectAll("div")
	.data(projectData)
	.enter()
	.append("div");


    let overlays = section.selectAll("div")
        .attr("class", "project-block")
	.append("div")
	.attr("class", "project-container");
    
    overlays.append("img")
    let imgs = overlays.selectAll("img")
	.attr("src", d => d.imgSrc)
	.attr("class", "project-img")
//	.style("max-width", "100%")


    
    let greys = overlays.append("div")
    .attr("class","project-background");
    

    
    overlays.append("a")
	.attr("class", "project-title")
	.on("mouseover", null)
	.text(d => d.title);

    overlays.append("a")
    	.attr("href", (d) => d.link)
	.attr("class", "project-hoverbox")
	.on("mouseover", function() {
	    d3.select(this.parentNode).select(".project-background")
		.transition().duration(200).style("opacity", 0.5);
	    d3.select(this.parentNode).select(".project-title")
		.transition().duration(100).style("opacity", 1.0)

	})
    	.on("touchstart", function() {
	    d3.select(this.parentNode).select(".project-background")
		.transition().duration(200).style("opacity", 0.5);
	    d3.select(this.parentNode).select(".project-title")
		.transition().duration(100).style("opacity", 1.0)

	})
    	.on("mouseout", function() {
	    d3.select(this.parentNode).select(".project-background")
		.transition().duration(200).style("opacity", 0)
	    d3.select(this.parentNode).select(".project-title")
		.transition().duration(100).style("opacity", 0)

	})
    	.on("touchend", function() {
	    d3.select(this.parentNode).select(".project-background")
		.transition().duration(200).style("opacity", 0)
	    d3.select(this.parentNode).select(".project-title")
		.transition().duration(100).style("opacity", 0)

	})
    
    
//    overlays.on("mouseover", (event,d) => de.select(this).attr("");
    console.log(blocks);
    
//    let overlays = blocks.append("div");

//    overlays.attr("class", "img-overlay");

    
    console.log(blocks);
    
}

loadSquares();
