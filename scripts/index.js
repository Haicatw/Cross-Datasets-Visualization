var loader = d3.select("body")
  .append("div")
  .attr("class", "loader");

loader.append("text")
  .text("Loading...");

//loading interface

//config

var url1 = "./data/world.geojson";
var url2 = "./data/countries_processed.csv";
var url3 = "./data/processed_NFA 2018.csv"

var q = d3.queue()
  .defer(d3.json, url1)
  .defer(d3.csv, url2)
  .defer(d3.csv, url3)
  .awaitAll(readInData);


var width = document.documentElement.clientWidth,
  height = document.documentElement.clientHeight,
  active = d3.select(null);

var selectionQueue = [undefined, undefined];
//Simply to create another one to avoid break other logic

var previousSelection = null;
var currentRadarData = [];
var processedRadarData = [];
var currentSelection = null;
var attribProperties = [
  'Literacy (%)',
  'Arable (%)',
  'Phones (per 1000)',
  'Industry',
  'Climate'
];

var MapProperty = [
  'GDP ($ per capita)',
  'Population'
];

var state = {
  mapProperty: 'GDP ($ per capita)',
}

var FootprintDataAttr = [
  "BiocapPerCap",
  "BiocapTotGHA",
  "EFConsPerCap",
  "EFConsTotGHA",
  "EFExportsPerCap",
  "EFExportsTotGHA",
  "EFImportsPerCap",
  "EFImportsTotGHA",
  "EFProdPerCap",
  "EFProdTotGHA"
];

var legendColor = [];
legendColor["Population"] = "#FF2983"
legendColor["GDP ($ per capita)"] = "#00FF54"

var colorScaleData = [];
colorScaleData["Population"] = [];
colorScaleData["GDP ($ per capita)"] = [];
colorScaleData["Population"][0] = [7000, 20000, 60000, 200000, 800000, 3000000, 7000000, 20000000, 100000000, 1320000000];
colorScaleData["Population"][1] = ["#9F0042", "#BF0050", "#DF005E", "#FF006C", "#FF2983", "#FF529A", "#FF7AB1", "#FFA3C9", "#FFCCE1", "#000000"].reverse();
colorScaleData["GDP ($ per capita)"][0] = [500, 1000, 2000, 3000, 5000, 10000, 15000, 25000, 30000, 55000];
colorScaleData["GDP ($ per capita)"][1] = ["#00591B", "#007523", "#00912D", "#00AC36", "#00C840", "#00E34A", "#00FF54", "#74FBA1", "#E2FEEB", "#000000"].reverse();

var colorScale = [];
colorScale["Population"] = d3.scaleThreshold()
  .domain([7000, 20000, 60000, 200000, 800000, 3000000, 7000000, 20000000, 100000000, 1320000000])
  .range(["#9F0042", "#BF0050", "#DF005E", "#FF006C", "#FF2983", "#FF529A", "#FF7AB1", "#FFA3C9", "#FFCCE1", "#000000"].reverse());

colorScale["GDP ($ per capita)"] = d3.scaleThreshold()
  .domain([500, 1000, 2000, 3000, 5000, 10000, 15000, 25000, 30000, 55000])
  .range(["#00591B", "#007523", "#00912D", "#00AC36", "#00C840", "#00E34A", "#00FF54", "#74FBA1", "#E2FEEB", "#000000"].reverse());


var colorRadar = d3.scaleOrdinal().range(["#EDC951","#CC333F","#00A0B0"]);

var radarMargin = {top: 0, right: 0, bottom: 0, left: 0};

var radarChartOptions = {
  w: width / 2,
  h: height / 2.5,
  margin: radarMargin,
  maxValue: 0.5,
  levels: 5,
  roundStrokes: true,
  color: colorRadar
};

const cfg = {
  w: 600,
  h: 600,
  margin: {top: 20, right: 20, bottom: 20, left: 20},
  levels: 3,
  maxValue: 0,
  labelFactor: 1.25,
  wrapWidth: 60,
  opacityArea: 0.35,
  dotRadius: 4,
  opacityCircles: 0.1,
  strokeWidth: 2,
  roundStrokes: false,
  color: d3.scaleOrdinal(d3.schemeCategory10),
  format: '.2%',
  unit: '',
  legend: false
 };

var allAxis,
 total,
 radius,
 Format,
 angleSlice,
 rScale = d3.scaleLinear();

var radarChartNormalizedScale = [];

/*--------------Globe Projection--------------*/
var projection = d3.geoOrthographic()//geoMercator()
    .scale(350)
    .translate([width / 4, height / 2]);

var rotate0, coords0;
var coords = () => projection.rotate(rotate0)
    .invert([d3.event.x, d3.event.y]);

var drag = d3.drag()
  .on('start', function(d) {
    rotate0 = projection.rotate();
    coords0 = coords();
  })
  .on('drag', function(d) {
    const coords1 = coords();
    projection.rotate([
      rotate0[0] + coords1[0] - coords0[0],
      rotate0[1] + coords1[1] - coords0[1],
    ])
    render();
  })
  .on('end', function(d) {
    render();
  });

var zoom = d3.zoom().on("zoom", zoomed);
var path = d3.geoPath().projection(projection);

var svg = d3.select("body").append("svg")
    .attr("width", width)
    .attr("height", height)
    .on("click", stopped, true);

svg.append("rect")
    .attr("class", "background")
    .attr("width", width / 2)
    .attr("height", height)
    .on("click", reset);

svg.append("rect")
    .attr("class", "rightBackground")
    .attr("width", width / 2)
    .attr("height", height)
    .attr("transform", "translate(" + width / 2 + ", " + 0 + ")")
    .on("click", reset);


var g = svg.append("g").attr("id", "map");

//the order does matter for drag and zoom
//in this order, wanted operation is overwriting the other one
svg.call(drag);
svg.call(zoom);

function readInData(error, data) {
  if (error) throw error;

  //process footprint data
  data[4] = [];
  data[2].forEach(element => {
    if(!data[4][element["ISO alpha-3 code"]]) {
      data[4][element["ISO alpha-3 code"]] = [];
      //++data[4].length;
      //this create empty useless array
    }
    FootprintDataAttr.forEach(attrName => {
      if(element["record"] == attrName)
      data[4][element["ISO alpha-3 code"]][attrName] = element["total"];
    });
  });

  data[3] = [];
  var currentTempIndex = 0;
  data[1].forEach(element => {
    element["Country"] = element["Country"].replace("Rep\.", "Republic");
    element["Country"] = element["Country"].replace("Repub\.", "Republic");
    element["Country"] = element["Country"].replace("Dem\.", "Democratic");

    var tempStringBeginning = element["Country"].match(", (.*)");
    var tempStringEnd = element["Country"].match("(.*), ");
    if(tempStringBeginning) {
      element["Country"] = tempStringBeginning[1] + " " + tempStringEnd[1];
    }

    element["Country"] = element["Country"].replace(" the ", " ");
    element["Country"] = element["Country"].replace(" of ", " ");
    element["Country"] = element["Country"].replace("The", "");
    element["Country"] = element["Country"].replace("  ", " ");
    element["Country"] = element["Country"].replace("-", " ");
    element["Country"] = element["Country"].replace("&", "and");

    element["Country"] = element["Country"].replace("Cote d'Ivoire", "Côte d'Ivoire");
    element["Country"] = element["Country"].replace("Tanzania", "United Republic Tanzania");
    element["Country"] = element["Country"].replace("Sao Tome and Principe", "São Tomé and Principe");
    if(element["Country"] == "Republic Congo") {
      element["Country"] = element["Country"].replace("Republic Congo", "Congo");
    }
    element["Country"] = element["Country"].trim();
    data[3][element["Country"]] = currentTempIndex;
    currentTempIndex++;
  });

  loader.remove();
  initMap(data);
  initializationToolTip();
  initControlCenter();

  initParallelAxisGraph(data);

  data[0]['features'].forEach(countryObject => {
    processedRadarData.push(
    { name: countryObject.countryName,
      axes: [
        {axis: 'BiocapTotGHA', realValue: countryObject['BiocapTotGHA'], value: radarChartNormalizedScale['BiocapTotGHA'](countryObject['BiocapTotGHA'])},
        {axis: 'EFConsTotGHA', realValue: countryObject['EFConsTotGHA'], value: radarChartNormalizedScale['EFConsTotGHA'](countryObject['EFConsTotGHA'])},
        {axis: 'EFExportsTotGHA', realValue: countryObject['EFExportsTotGHA'], value: radarChartNormalizedScale['EFExportsTotGHA'](countryObject['EFExportsTotGHA'])},
        {axis: 'EFImportsTotGHA', realValue: countryObject['EFImportsTotGHA'], value: radarChartNormalizedScale['EFImportsTotGHA'](countryObject['EFImportsTotGHA'])},
        {axis: 'EFProdTotGHA', realValue: countryObject['EFProdTotGHA'], value: radarChartNormalizedScale['EFProdTotGHA'](countryObject['EFProdTotGHA'])}
      ]
    })
  });


  initRadarChart("#radarChart", processedRadarData, radarChartOptions);
}

function render() {
  g.selectAll("path").attr('d', path);

  const point = {
    type: 'Point',
    coordinates: [0, 0]
  };
};

var map;

function initMap(data) {
  g.append("circle")
    .attr("class", "globeDecorator")
    .attr("r", 350)
    .attr("cx", width / 4)
    .attr("cy", height / 2)
    .style("fill", "#565656")
    .on("click", reset);
  
  //following code would add glow effect to the sphere, however it is too expansive and cause interactive crapy
  //comment code above and uncomment code below to see the glow effect
  /*
  g.append("circle")
    .attr("class", "globeDecorator")
    .attr("r", 350)
    .attr("cx", width / 4)
    .attr("cy", height / 2)
    .style("fill", "#565656")
    .attr("filter", "url(\"#glow\")")
  
  var defs = g.append("defs");

  //Code taken from http://stackoverflow.com/questions/9630008/how-can-i-create-a-glow-around-a-rectangle-with-svg
  //Filter for the outside glow
  var filter = defs.append("filter")
    .attr("id","glow");

  filter.append("feGaussianBlur")
    .attr("class", "blur")
    .attr("stdDeviation","4.5")
    .attr("result","coloredBlur");

  var feMerge = filter.append("feMerge");
  feMerge.append("feMergeNode")
    .attr("in","coloredBlur");
  feMerge.append("feMergeNode")
    .attr("in","SourceGraphic");
    */

  g.selectAll("path")
      .data(data[0].features)
    .enter().append("path")
      .attr("d", path)
      .attr("class", "feature")
      .on("click", clicked);

  map = d3.select("#map").selectAll("path");

  map.datum(function(d) {
    d.properties.NAME = d.properties.NAME.replace(" the ", " ");
    d.properties.NAME = d.properties.NAME.replace(" of ", " ");
    d.properties.NAME = d.properties.NAME.replace("-", " ");
    d.properties.NAME = d.properties.NAME.replace("Eq\.", "Equatorial");
    d.properties.NAME = d.properties.NAME.replace("W\.", "Western");
    d.properties.NAME = d.properties.NAME.replace("S\.", "South");
    d.properties.NAME = d.properties.NAME.replace("Fr\.", "French");
    d.properties.NAME = d.properties.NAME.replace("Herz\.", "Herzegovina");
    d.properties.NAME = d.properties.NAME.replace("Rep\.", "Republic");
    d.properties.NAME = d.properties.NAME.replace("Dem\.", "Democratic");
    d.properties.NAME = d.properties.NAME.replace("Is\.", "Islands");
    d.properties.NAME = d.properties.NAME.replace("N. Cyprus", "Cyprus");
    d.properties.NAME = d.properties.NAME.replace("Czechia", "Czech Republic");
    d.properties.NAME = d.properties.NAME.replace("Faeroe Islands", "Faroe Islands");
    d.properties.NAME = d.properties.NAME.replace("Lao PDR", "Laos");
    d.properties.NAME = d.properties.NAME.replace("Myanmar", "Burma");
    d.properties.NAME = d.properties.NAME.replace("Timor Leste", "East Timor");
    d.properties.NAME = d.properties.NAME.replace("Tanzania", "United Republic Tanzania");
    d.countryName = d.properties.NAME;
    
    MapProperty.forEach(function(element) {
        if(d.countryName != "South Sudan"
        && d.countryName != "Somaliland"
        && d.countryName != "Aland"
        && d.countryName != "French South Antarctic Lands"
        && d.countryName != "Cyprus U.N. Buffer Zone"
        && d.countryName != "Dhekelia"
        && d.countryName != "Falkland Islands"
        && d.countryName != "Baikonur"
        && d.countryName != "Siachen Glacier"
        && d.countryName != "Kosovo"
        && d.countryName != "Montenegro"
        && d.countryName != "Palestine"
        && d.countryName != "South Geo. and S. Sandw. Islands") {
        d[element] = +data[1][data[3][d.countryName]][element];
      } else {
        d[element] = undefined;
      }
    });

    attribProperties.forEach(function(element) {
        if(d.countryName != "South Sudan"
        && d.countryName != "Somaliland"
        && d.countryName != "Aland"
        && d.countryName != "French South Antarctic Lands"
        && d.countryName != "Cyprus U.N. Buffer Zone"
        && d.countryName != "Dhekelia"
        && d.countryName != "Falkland Islands"
        && d.countryName != "Baikonur"
        && d.countryName != "Siachen Glacier"
        && d.countryName != "Kosovo"
        && d.countryName != "Montenegro"
        && d.countryName != "Palestine"
        && d.countryName != "South Geo. and S. Sandw. Islands") {
        d[element] = +data[1][data[3][d.countryName]][element];
      } else {
        d[element] = undefined;
      }
    });

    if(!(typeof data[4][d["properties"]["ISO_A3"]] === 'undefined')) {
      FootprintDataAttr.forEach(attrbute => {
        d[attrbute] = +data[4][d["properties"]["ISO_A3"]][attrbute];
      });
    } else {
      FootprintDataAttr.forEach(attrbute => {
        d[attrbute] = undefined;
      });
    }

    return d;
  });

  FootprintDataAttr.forEach(attrbute => {
    var tempRange = [d3.min(data[0]["features"], function(d) {
      if(typeof d[attrbute] === 'undefined') {
        return data[0]["features"][0][attrbute];
      } else {
        return d[attrbute];
      }
    }), d3.max(data[0]["features"], function(d) {
      if(typeof d[attrbute] === 'undefined') {
        return data[0]["features"][0][attrbute];
      } else {
        return d[attrbute];
      }
    })];
    radarChartNormalizedScale[attrbute] = d3.scaleLinear()
    .domain(tempRange)
    .range([0, 1]);
  });

  map.attr("id", function(d) {
    return d.countryName;
  });

  updateMap();
  initTooltips();
  initLegend(data);
  initBackground();

}

function updateMap() {
  // add the name as its id
  map
    .transition()
    .duration(500)
    .attr("fill", function(d) {
        return colorScale[state["mapProperty"]](d[state["mapProperty"]]);
      });
}

function clicked(d) {
  if (currentSelection == null) {
    currentSelection = d3.select(this).attr("id");
    previousSelection = d3.select(this).attr("id");
  } else if(currentSelection != d3.select(this).attr("id")) {
    previousSelection = currentSelection;
    currentSelection = d3.select(this).attr("id");
  }

  if (selectionQueue[0] != d3.select(this).attr("id") && selectionQueue[1] != d3.select(this).attr("id")) {
    selectionQueue[1] = selectionQueue[0];
    selectionQueue[0] = d3.select(this).attr("id");
  }

  if (active.node() === this) return reset();
  active.classed("active", false);
  active = d3.select(this).classed("active", true);

  var bounds = path.bounds(d),
      dx = bounds[1][0] - bounds[0][0],
      dy = bounds[1][1] - bounds[0][1],
      x = (bounds[0][0] + bounds[1][0]) / 2,
      y = (bounds[0][1] + bounds[1][1]) / 2,
      scale = Math.max(1, Math.min(8, 0.5 / Math.max(dx / width, dy / height))),
      translate = [width / 4 - scale * x, height / 2 - scale * y];

  svg.transition()
      .duration(750)
      .call( zoom.transform, d3.zoomIdentity.translate(translate[0],translate[1]).scale(scale) ); // updated for d3 v4

  updateParallelAxisGraph();
  updateRadarChart(getRadarDataBasedOnQueue());
}

function reset() {
  active.classed("active", false);
  active = d3.select(null);

  svg.transition()
      .duration(750)
      .call( zoom.transform, d3.zoomIdentity );

  //projection.rotate([0,0])
  //interfere with some of the operation, doesn't offer good user experience and it is not that useful to reset rotation anyways.
  //render();
}

function zoomed() {
  g.style("stroke-width", 1.5 / d3.event.transform.k + "px");
  g.attr("transform", d3.event.transform);
}

// If the drag behavior prevents the default click,
// also stop propagation so we don’t click-to-zoom.
function stopped() {
  if (d3.event.defaultPrevented) d3.event.stopPropagation();
}

/*--------------Initialize Tooltip--------------*/
function initializationToolTip() {
  d3.select("body")
    .append("div")
    .attr("class", "tooltipContainer")
    .append("div")
    .attr("class", "tooltipMap");

  d3.select(".tooltipContainer")
    .append("div")
    .attr("class", "tooltipMapText");

}

//---------Tooltips------------//
function initTooltips() {
  d3.select("#map").selectAll("path")
  .on("mouseover", function(datum) {

    var tooltip = d3.select(".tooltipContainer");
    tooltip.style("left", (d3.event.pageX - 50) + "px");
    tooltip.style("top", (d3.event.pageY - 50) + "px");

    var dataShown = "N/A";
    if (datum[state["mapProperty"]] != undefined) {
      dataShown = datum[state["mapProperty"]];
    }

    d3.select(".tooltipMapText").html("<p>" + datum.countryName + "<p>" + "<p>" + state["mapProperty"] + "</p>" + dataShown + "<br/>");
    return tooltip.style("display", "block");
  })
  .on("mousemove", function(datum) {
    var tooltip = d3.select(".tooltipContainer");

    tooltip.style("left", (d3.event.pageX - 50) + "px");
    tooltip.style("top", (d3.event.pageY - 50) + "px");
  })
  .on("mouseleave", function(datum) {
    var tooltip = d3.select(".tooltipContainer");

    tooltip.style("display", "none");
  });
}
/*--------------Initialize Control Center------*/
function initControlCenter() {
  var controlCenter = d3.select("svg").append("g")
    .attr("id", "ControlCenter")

  var counter = 0;

  MapProperty.forEach(function(d){

    controlCenter.append("text")
      .text("Options (click on ledgend): ")
      .attr("y", 35)
      .attr("x", 20);

    controlCenter.append("rect")
      .attr("id", d)
      .attr("width", 20)
      .attr("height", 20)
      .attr("y", 50 + counter * 40)
      .attr("x", 20)
      .attr("fill", function(element) {
        return legendColor[d];
      })
      .on("click", function(subD){
        state["mapProperty"] = d;
        updateMap();
        //updateLegend();
      });

    controlCenter.append("text")
      .text(d)
      .attr("y", 65 + counter * 40)
      .attr("x", 50);

    counter++;
  });
}

/*--------------Initialize Legends------------*/

function initLegend(data) {
  d3.select("#map")
    .append("g")
    .attr("class", "mapLegend");

  var mapLegend = d3.select(".mapLegend");

  var counter = 0;
  var counter_ = 0;
  MapProperty.forEach(function(MPElement) {
    counter_ = 0;
    //console.log(colorScaleData[MPElement][0]);
    colorScaleData[MPElement][0].forEach(function(text) {
      mapLegend.append("rect")
        .attr("width", 80)
        .attr("height", 20)
        .attr("x", counter_ * 80)
        .attr("y", counter * 50)
        .style("fill", colorScaleData[MPElement][1][counter_]);
      mapLegend.append("text")
        .attr("class", "mapLegendText")
        .attr("x", 40 + counter_ * 80)
        .attr("y", 35 + counter * 50)
        .style("text-anchor", "center")
        .text(text);
    counter_++;
    });
    counter++;
  });

  mapLegend.attr("transform", "translate(" + 0 + ", " + (height - 120) + ")");
  mapLegend.append("text")
    .attr("class", "mapLegendText")
    .attr("x", 0)
    .attr("y", 35)
    .style("text-anchor", "center")
    .text("N/A");
  mapLegend.append("text")
    .attr("class", "mapLegendText")
    .attr("x", 0)
    .attr("y", 35 + 50)
    .style("text-anchor", "center")
    .text("N/A");
}

//---------ScatterPlot------------//
//there is no scatterPlot
//not the best choice to visualize chosen dataset

function initBackground() {
  svg.append("rect")
    .attr("class", "clearerBackground")
    .attr("width", width / 2)
    .attr("height", height / 2 + 11)
    .attr("transform", "translate(" + width / 2 + ", " + 0 + ")")
    .on("click", reset);
}
//---------Parallel Axis----------//
function initParallelAxisGraph(data) {
  var parallelAxisGraph = svg.append("g").attr("class", "parallelAxisGraph");

  parallelAxisGraph.attr("transform", "translate(" + width / 2 + ", " + 100 + ")");

  var praX = d3.scalePoint().range([0, width / 2]).padding(1),
    parY = {},
    dragging = {};

  var line = d3.line(),
    parYAxis = d3.axisLeft(),
    background,
    foreground;

  praX.domain(dimensions = d3.keys(data[1][0]).filter(function(d) {
    return d != "Country" && attribProperties.indexOf(d) != -1 && (parY[d] = d3.scaleLinear()
        .domain(d3.extent(data[1], function(p) {
          return +p[d];
        }))
        .range([height / 2.5, 0]));
  }));

  background = parallelAxisGraph.append("g")
      .attr("class", "backgroundP")
    .selectAll("path")
      .data(data[1])
    .enter().append("path")
      .attr("d", path)
    .attr("class", function(d) {
      return d.Country.replace(/ /g, '');
    });

  // Add a group element for each dimension.
  var parG = parallelAxisGraph.selectAll(".dimension")
      .data(dimensions)
    .enter().append("g")
      .attr("class", "dimension")
      .attr("transform", function(d) {
        return "translate(" + praX(d) + ")";
      });

  // Add an axis and title.
  parG.append("g")
      .attr("class", "axis")
      .each(function(d) { 
        var tempSelection = d3.select(this)
          .call(parYAxis.scale(parY[d]));
        
        tempSelection.selectAll(".tick")
          .selectAll("line")
          .style("stroke", "white"); 
        
        tempSelection.selectAll(".domain")
          .style("stroke", "white");
      })
    .append("text")
      .style("text-anchor", "middle")
      .attr("y", -9)
      .text(function(d) {
        return d;
      });

  function path(d) {
    return line(dimensions.map(function(p) {
      //console.log("p: ", p);
      return [praX(p), parY[p](d[p])];
    }));
  }

  parallelAxisGraph.selectAll("text")
    .style("stroke", "white")
    .style("stroke-opacity", 1);

  parallelAxisGraph.selectAll(".dimension")
    .style("stroke", "white")
    .style("stroke-opacity", 1);

  parallelAxisGraph.append("g")
    .attr("class", "currentTitle")
    .append("text")
    .text(function(d) {
      if (currentSelection == null) {
        return "Please Select a Country";
      } else {
        return currentSelection;
      }
    })
    .style("text-anchor", "middle")
    .attr("transform", "translate(" + width / 4 + ", " + -50 + ")");
}

function validateCountries(countryName) {
  if(countryName != "South Sudan"
        && countryName != "Somaliland"
        && countryName != "Aland"
        && countryName != "French South Antarctic Lands"
        && countryName != "Cyprus U.N. Buffer Zone"
        && countryName != "Dhekelia"
        && countryName != "Falkland Islands"
        && countryName != "Baikonur"
        && countryName != "Siachen Glacier"
        && countryName != "Kosovo"
        && countryName != "Montenegro"
        && countryName != "Palestine"
        && countryName != "South Geo. and S. Sandw. Islands") {
            return true;
        }
  return false;
}

function updateParallelAxisGraph() {
  d3.select(".currentTitle")
    .select("text")
    .text(function(d) {
      if (currentSelection == null) {
        return "Please Select a Country";
      } else {
        if(validateCountries(currentSelection)) {
          return currentSelection;
        }
          return currentSelection + " (Data Not Availiable)";
      }
    });
  if(currentSelection != null) {
    d3.select(".parallelAxisGraph")
      .select("." + currentSelection.replace(/ /g, ''))
      .classed("currentSelected", true);

    if(currentSelection == previousSelection) {
      return;
    }
    d3.select(".parallelAxisGraph")
      .select("." + previousSelection.replace(/ /g, ''))
      .classed("currentSelected", false);
  } else {
    d3.select(".parallelAxisGraph")
      .select("." + previousSelection.replace(/ /g, ''))
      .classed("currentSelected", false);
  }
}

//avoid name conflict add seperate group for radar chart
d3.select("svg")
  .append('g')
  .attr("id", "radarChart")

function getRadarDataBasedOnQueue() {
  currentRadarData.length = 0;
  selectionQueue.forEach(function(selectEle) {
      processedRadarData.forEach(function (d) {
        if(!(typeof selectEle === 'undefined') && selectEle === d.name) {
          currentRadarData.push(d);
        }
      });
    }
  );
  return currentRadarData;
}

const max = Math.max;
const sin = Math.sin;
const cos = Math.cos;
const HALF_PI = Math.PI / 2;

function initRadarChart(parent_selector, data, options) {
  d3.select(parent_selector)
    .attr("transform", "translate(" + width / 2 + ", " + (height / 2 + 50) + ")");
	//Wraps SVG text from http://bl.ocks.org/mbostock/7555321
	const wrap = (text, width) => {
	  text.each(function() {
			var text = d3.select(this),
				words = text.text().split(/\s+/).reverse(),
				word,
				line = [],
				lineNumber = 0,
				lineHeight = 1.4, // ems
				y = text.attr("y"),
				x = text.attr("x"),
				dy = parseFloat(text.attr("dy")),
				tspan = text.text(null).append("tspan").attr("x", x).attr("y", y).attr("dy", dy + "em");

			while (word = words.pop()) {
			  line.push(word);
			  tspan.text(line.join(" "));
			  if (tspan.node().getComputedTextLength() > width) {
					line.pop();
					tspan.text(line.join(" "));
					line = [word];
					tspan = text.append("tspan").attr("x", x).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
			  }
			}
	  });
  }
  
	//Put all of the options into cfg variable
	if('undefined' !== typeof options){
	  for(var i in options){
		  if('undefined' !== typeof options[i]){ cfg[i] = options[i]; }
	  }
	}

	//If the supplied maxValue is smaller than the actual one, replace by the max in the data
	let maxValue = 0;
	for (let j=0; j < data.length; j++) {
		for (let i = 0; i < data[j].axes.length; i++) {
			data[j].axes[i]['id'] = data[j].name;
			if (data[j].axes[i]['value'] > maxValue) {
				maxValue = data[j].axes[i]['value'];
			}
		}
	}
	maxValue = max(cfg.maxValue, maxValue);

	allAxis = data[0].axes.map((i, j) => i.axis),
  total = allAxis.length,
  radius = Math.min(cfg.w/2, cfg.h/2),
  Format = d3.format(cfg.format),
  angleSlice = Math.PI * 2 / total;

	//Scale for the radius
	rScale = d3.scaleLinear() //TODO: changed scaleLinear to scaleLog //update: it make it worse
		.range([0, radius])
		.domain([0, maxValue]);

	const parent = d3.select(parent_selector);

	//Remove whatever chart with the same id/class was present before
	parent.select("svg").remove();

	//Initiate the radar chart SVG
	let svg = parent.append("g")//change svg to g unknow bug?
			.attr("width",  cfg.w + cfg.margin.left + cfg.margin.right)
			.attr("height", cfg.h + cfg.margin.top + cfg.margin.bottom)
      .attr("class", "radarChart");

	let g = svg.append("g")
      .attr("transform", "translate(" + (cfg.w/2 + cfg.margin.left) + "," + (cfg.h/2 + cfg.margin.top) + ")")
      .attr("class", "radarWorkArea");

	//Filter for the outside glow
	let filter = g.append('defs').append('filter').attr('id','glow'),
		feGaussianBlur = filter.append('feGaussianBlur').attr('stdDeviation','2.5').attr('result','coloredBlur'),
		feMerge = filter.append('feMerge'),
		feMergeNode_1 = feMerge.append('feMergeNode').attr('in','coloredBlur'),
		feMergeNode_2 = feMerge.append('feMergeNode').attr('in','SourceGraphic');

	let axisGrid = g.append("g").attr("class", "axisWrapper");

	axisGrid.selectAll(".levels")
	   .data(d3.range(1,(cfg.levels+1)).reverse())
	   .enter()
		.append("circle")
		.attr("class", "gridCircle")
		.attr("r", d => radius / cfg.levels * d)
		.style("fill", "#CDCDCD")
		.style("stroke", "#CDCDCD")
		.style("fill-opacity", cfg.opacityCircles)
		.style("filter" , "url(#glow)");

	axisGrid.selectAll(".axisLabel")
	   .data(d3.range(1,(cfg.levels+1)).reverse())
	   .enter().append("text")
	   .attr("class", "axisLabel")
	   .attr("x", 4)
	   .attr("y", d => -d * radius / cfg.levels)
	   .attr("dy", "0.4em")
	   .style("font-size", "10px")
	   .attr("fill", "#ededed")
	   .text(d => Format(maxValue * d / cfg.levels) + cfg.unit);

	var axis = axisGrid.selectAll(".axis")
		.data(allAxis)
		.enter()
		.append("g")
    .attr("class", "axis");

	axis.append("line")
		.attr("x1", 0)
		.attr("y1", 0)
		.attr("x2", (d, i) => rScale(maxValue *1.1) * cos(angleSlice * i - HALF_PI))
		.attr("y2", (d, i) => rScale(maxValue* 1.1) * sin(angleSlice * i - HALF_PI))
		.attr("class", "line")
		.style("stroke", "white")
		.style("stroke-width", "2px");

	axis.append("text")
		.attr("class", "legend")
		.style("font-size", "11px")
		.attr("text-anchor", "middle")
		.attr("dy", "0.35em")
		.attr("x", (d,i) => rScale(maxValue * cfg.labelFactor) * cos(angleSlice * i - HALF_PI))
		.attr("y", (d,i) => rScale(maxValue * cfg.labelFactor) * sin(angleSlice * i - HALF_PI))
		.text(d => d)
    .call(wrap, cfg.wrapWidth)
    .style("fill", "white");
}

function updateRadarChart(data) {
  d3.selectAll(".radarWrapper").remove();
  d3.selectAll(".radarCircleWrapper").remove();
  parent = d3.select(".radarChart");
  var g = parent.select(".radarWorkArea");

	const radarLine = d3.radialLine()
    .curve(d3.curveLinearClosed)
    .radius(d => rScale(d.value))
    .angle((d,i) => i * angleSlice);

  if(cfg.roundStrokes) {
    radarLine.curve(d3.curveCardinalClosed)
  }

	const blobWrapper = g.selectAll(".radarWrapper")
    .data(data)
    .enter().append("g")
    .attr("class", "radarWrapper");

  blobWrapper
    .append("path")
    .attr("class", "radarArea")
    .attr("d", d => radarLine(d.axes))
    .style("fill", (d,i) => cfg.color(i))
    .style("fill-opacity", cfg.opacityArea)
    .on('mouseover', function(d, i) {
      parent.selectAll(".radarArea")
        .transition().duration(200)
        .style("fill-opacity", 0.1);

      d3.select(this)
        .transition().duration(200)
        .style("fill-opacity", 0.7);
    })
    .on('mouseout', () => {
      parent.selectAll(".radarArea")
        .transition().duration(200)
        .style("fill-opacity", cfg.opacityArea);
    });

  blobWrapper.append("path")
    .attr("class", "radarStroke")
    .attr("d", function(d,i) { return radarLine(d.axes); })
    .style("stroke-width", cfg.strokeWidth + "px")
    .style("stroke", (d,i) => cfg.color(i))
    .style("fill", "none")
    .style("filter" , "url(#glow)");

  blobWrapper.selectAll(".radarCircle")
    .data(d => d.axes)
    .enter()
    .append("circle")
    .attr("class", "radarCircle")
    .attr("r", cfg.dotRadius)
    .attr("cx", (d,i) => rScale(d.value) * cos(angleSlice * i - HALF_PI))
    .attr("cy", (d,i) => rScale(d.value) * sin(angleSlice * i - HALF_PI))
    .style("fill", (d) => cfg.color(d.id))
    .style("fill-opacity", 0.8);

  const blobCircleWrapper = g.selectAll(".radarCircleWrapper")
    .data(data)
    .enter().append("g")
    .attr("class", "radarCircleWrapper");

  blobCircleWrapper.selectAll(".radarInvisibleCircle")
    .data(d => d.axes)
    .enter().append("circle")
    .attr("class", "radarInvisibleCircle")
    .attr("r", cfg.dotRadius * 1.5)
    .attr("cx", (d,i) => rScale(d.value) * cos(angleSlice*i - HALF_PI))
    .attr("cy", (d,i) => rScale(d.value) * sin(angleSlice*i - HALF_PI))
    .style("fill", "none")
    .style("pointer-events", "all")
    .on("mouseover", function(d,i) {
      tooltip
        .attr('x', this.cx.baseVal.value - 10)
        .attr('y', this.cy.baseVal.value - 10)
        .transition()
        .style('display', 'block')
        .text(function(ele) {
          return d.id + ", " + "Value: " + radarChartNormalizedScale[d["axis"]].invert(d.value) + " " + "Percentile: " + Format(d.value) + cfg.unit;
        }) //fixed the return value here
        .style("fill", "#d6d6d6");
    })
    .on("mouseout", function(){
      tooltip.transition()
        .style('display', 'none').text('');
    });

  const tooltip = g.append("text")
    .attr("class", "tooltip")
    .attr('x', 0)
    .attr('y', 0)
    .style("font-size", "12px")
    .style('display', 'none')
    .attr("text-anchor", "middle")
    .attr("dy", "0.35em");

  if (cfg.legend !== false && typeof cfg.legend === "object") {
    let legendZone = svg.append('g');
    let names = data.map(el => el.name);
    if (cfg.legend.title) {
      let title = legendZone.append("text")
        .attr("class", "title")
        .attr('transform', `translate(${cfg.legend.translateX},${cfg.legend.translateY})`)
        .attr("x", cfg.w - 70)
        .attr("y", 10)
        .attr("font-size", "12px")
        .attr("fill", "#404040")
        .text(cfg.legend.title);
    }
    let legend = legendZone.append("g")
      .attr("class", "legend")
      .attr("height", 100)
      .attr("width", 200)
      .attr('transform', `translate(${cfg.legend.translateX},${cfg.legend.translateY + 20})`);

    legend.selectAll('rect')
      .data(names)
      .enter()
      .append("rect")
      .attr("x", cfg.w - 65)
      .attr("y", (d,i) => i * 20)
      .attr("width", 10)
      .attr("height", 10)
      .style("fill", (d,i) => cfg.color(i));
    legend.selectAll('text')
      .data(names)
      .enter()
      .append("text")
      .attr("x", cfg.w - 52)
      .attr("y", (d,i) => i * 20 + 9)
      .attr("font-size", "11px")
      .attr("fill", "#737373")
      .text(d => d);
  }
}
