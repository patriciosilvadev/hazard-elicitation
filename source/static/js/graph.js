class Graph {
    static GRAPH = null;

    constructor(svg, context_menu, graph) {
        Graph.GRAPH = this;

        this.properties = {
            sticky_nodes:    false,
            tooltip:         false,
            node_size:       5,
            edge_size:       2,
            edge_arrow_size: {w: 2, h: 6},
            colors:          d3.scaleOrdinal(d3.schemeCategory10)
        }

        this.context_menu = new ContextMenu(context_menu);

        this.svg = d3.select(svg);
        this.svg.on("click", function () { Graph.ContextMenu.hide() });

        this.anchor = this.svg.append("g");
        this.anchor.on("click", function () { Graph.ContextMenu.hide() });

        this.graph       = graph;
        this.graph_nodes = graph.nodes._values();
        this.graph_edges = graph.edges._values();
        const width      = this.svg.node().getBoundingClientRect().width;
        const height     = this.svg.node().getBoundingClientRect().height;

        this.createContainer();
        this.createEdges();
        this.createNodes();
        this.createLinkLabels();
        this.createNodeLabels();

        this.simulation = d3
            .forceSimulation(this.graph_nodes)
            .force("charge", d3.forceManyBody().strength(-10000))
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force("x", d3.forceX(width / 2).strength(0.1))
            .force("y", d3.forceY(height / 2).strength(0.1))
            .force("link", d3.forceLink(this.graph_edges).id(function (l) { return l.id; }).distance(25).strength(1))
            .on("tick", Graph.onTick);

        this.zoom_level = d3
            .zoom()
            .scaleExtent([.1, 4])
            .on("zoom", Graph.onZoom);
        this.svg.call(this.zoom_level);

        this.nodes.call(
            d3.drag()
              .on("start", function (n) {
                  d3.event.sourceEvent.stopPropagation();
                  if (!d3.event.active)
                      Graph.Simulation.alphaTarget(0.5).restart();
                  n.fx = n.x;
                  n.fy = n.y;
              })
              .on("drag", function (n) {
                  n.fx = d3.event.x;
                  n.fy = d3.event.y;
                  Graph.ContextMenu.hide();
              })
              .on("end", function (n) {
                  if (!Graph.get("sticky")) {
                      if (!d3.event.active)
                          Graph.Simulation.alphaTarget(0);
                      n.fx = null;
                      n.fy = null;
                  }
              })
        );

        const na = $(".nodes");
        const ea = $(".edges");
        const vs = graph.hazards._values();
        for (const v in vs) {
            for (const n in vs[v].nodes) {
                na.find("#" + vs[v].nodes[n])
                  .attr("class", "hazard")
            }

            for (const n in vs[v].edges) {
                ea.find("#" + vs[v].edges[n])
                  .attr("class", "hazard")
            }
        }

        Graph.zoom(1.5);
    }

    static get SVG() { return Graph.GRAPH.svg; }

    static get Anchor() { return Graph.GRAPH.anchor; }

    static get Simulation() { return Graph.GRAPH.simulation; }

    static get Graph() { return Graph.GRAPH.graph; }

    static get Nodes() { return Graph.GRAPH.nodes; }

    static get NodeLabels() { return Graph.GRAPH.node_labels; }

    static get Edges() { return Graph.GRAPH.edges; }

    static get EdgeLabels() { return Graph.GRAPH.edge_labels; }

    static get ContextMenu() { return Graph.GRAPH.context_menu; }

    static get(property) { return Graph.GRAPH.get(property); }

    static set(property, value) { Graph.GRAPH.set(property, value); }

    get(property) { return this.properties[property]; }

    set(property, value) { this.properties[property] = value; }

    /* Init Graph */

    createContainer() {
        const node_size  = this.get("node_size");
        const arrow_size = this.get("edge_arrow_size");
        this.anchor
            .append("svg:defs")
            .selectAll("marker")
            .data(["end"])
            .enter()
            .append("svg:marker")
            .attr("id", String)
            .attr("class", "arrowhead")
            .attr("viewBox", "0 -{} {} {}".format(arrow_size.w, arrow_size.h, arrow_size.w * 2))
            .attr("markerWidth", node_size)
            .attr("markerHeight", node_size)
            .attr("orient", "auto")
            .append("svg:path")
            .attr("d", "M 0,-{} L {},0 L 0,{}".format(arrow_size.w, arrow_size.h, arrow_size.w));
    }

    createEdges() {
        this.edges = this
            .anchor
            .append("g")
            .attr("class", "edges")
            .selectAll("line")
            .data(this.graph_edges)
            .enter()
            .append("path")
            .attr("id", function (e) { return e.id; })
            .attr("marker-end", "url(#end)")
            .attr("d", "M 0 0 L 0 0")
            .on("contextmenu", Graph.onContextMenu)
            .on("click", Graph.onLinkClick)
            .on("mouseover", Graph.onMouseover)
            .on("mousemove", Graph.onMousemove)
            .on("mouseout", Graph.onMouseout);
    }

    createNodes() {
        this.nodes = this
            .anchor
            .append("g")
            .attr("class", "nodes")
            .selectAll("g")
            .data(this.graph_nodes)
            .enter()
            .append("circle")
            .attr("r", this.get("node_size"))
            .attr("id", function (n) { return n.id; })
            .attr("fill", function (n) { if (n.hazard) return "red"; else return Graph.get("colors")(n.group); })
            .on("contextmenu", Graph.onContextMenu)
            .on("click", Graph.onNodeClick)
            .on("mouseover", Graph.onMouseover)
            .on("mousemove", Graph.onMousemove)
            .on("mouseout", Graph.onMouseout);
    }

    createLinkLabels() {
        this.edge_labels = this
            .anchor
            .append("g")
            .attr("class", "edge-labels")
            .selectAll("g")
            .data(this.graph_edges)
            .enter()
            .append("text")
            .text(function (e) { return e.label; });
    }

    createNodeLabels() {
        this.node_labels = this
            .anchor
            .append("g")
            .attr("class", "node-labels")
            .selectAll("g")
            .data(this.graph_nodes)
            .enter()
            .append("text")
            .text(function (n) { return n.label; });
    }

    static transformCoordinates(ctx, x_offset = 0, y_offset = 0) {
        // Position
        const svg_pos   = Graph.SVG.node().getBoundingClientRect();
        const mouse_pos = d3.mouse(ctx);

        // Transformation
        const transform     = d3.zoomTransform(Graph.Anchor.node());
        const zoom_factor   = transform.k;
        const scroll_offset = transform.invert(mouse_pos);

        // New coordinates
        const x = mouse_pos[0] + (mouse_pos[0] - scroll_offset[0] + x_offset / zoom_factor) * zoom_factor;
        const y = mouse_pos[1] + (mouse_pos[1] - scroll_offset[1] + y_offset / zoom_factor) * zoom_factor;
        return {"x": svg_pos.x + x, "y": svg_pos.y + y}
    }

    /* Callbacks */

    static onTick() {
        Graph.Edges.attr("d", function (l) {
            const node_size = Graph.get("node_size");
            const x1        = l.source.x,
                  y1        = l.source.y,
                  x2        = l.target.x,
                  y2        = l.target.y;

            if (l.source !== l.target) {
                const dx = x2 - x1,
                      dy = y2 - y1,
                      dr = Math.sqrt(dx * dx + dy * dy);

                return "M {} {} A {} {} 0 0 1 {} {}".format(x1, y1, dr, dr, x2, y2); // curved line
                // return "M {} {} L {} {}".format(x1, y1, x2, y2) // straight line
            }
            const scale = l.label.length * 3; // TODO size of the curve
            return "M {} {} C {} {} {} {} {} {}".format(x1, y1, x1 - scale, y1 - scale, x1 - scale, y1 + scale, x2 + node_size / 2, y2 + node_size / 2);
        })

        Graph.Edges.attr("d", function (l) {
            const node_size  = Graph.get("node_size");
            const edge_size  = Graph.get("edge_size");
            const arrow_size = Graph.get("edge_arrow_size");

            const x1 = l.source.x,
                  y1 = l.source.y,
                  x2 = l.target.x,
                  y2 = l.target.y;

            const pl = this.getTotalLength(),
                  r  = node_size + arrow_size.h + edge_size * 2,
                  m  = this.getPointAtLength(pl - r);

            const dx = m.x - x1,
                  dy = m.y - y1,
                  dr = Math.sqrt(dx * dx + dy * dy);

            if (l.source !== l.target) {
                return "M" + x1 + "," + y1 + "A" + dr + "," + dr + " 0 0,1 " + m.x + "," + m.y;
            } else {
                const scale = l.label.length * 3; // TODO size of the curve
                return "M {} {} C {} {} {} {} {} {}".format(x1, y1, x1 - scale, y1 - scale, x1 - scale, y1 + scale, m.x, m.y);
            }
        })

        Graph.Nodes
             .attr("cx", function (n) { return n.x; })
             .attr("cy", function (n) { return n.y; });

        Graph.NodeLabels
             .attr("x", function (n) { return n.x + 10; })
             .attr("y", function (n) { return n.y; });

        Graph.EdgeLabels
             .attr("x", function (l) { return l.source.x + (l.target.x - l.source.x) * 0.5 + 10; })
             .attr("y", function (l) { return l.source.y + (l.target.y - l.source.y) * 0.5 + 15; });
    }

    static onZoom() {
        if(d3.event) {
            Graph.Anchor.attr("transform", d3.event.transform);
            d3.select("#zoom").property("value", d3.event.transform.k);
            Graph.ContextMenu.hide();
        }
    }

    static onLinkClick(e, _, arr) {
        let n = d3.select(arr[e.index]);
    }

    static onNodeClick(e, _, arr) {
        if (e.defaultPrevented)
            return;
    }

    static onContextMenu(e) {
        const coords = Graph.transformCoordinates(this, 20, 10)
        Graph.ContextMenu.show(coords.x, coords.y, e);

        d3.event.preventDefault();
    }

    static onMouseover(e) {
        if (e.hasOwnProperty("source")) {
            d3.select(this).attr("stroke-width", Graph.get("edge_size") + 1);
        } else {
            d3.select(this).attr("r", Graph.get("node_size") + 1);
        }
    }

    static onMousemove(e) {
        if (Graph.get("tooltip")) {
            const len    = e.label.length * 6 + 20;
            const coords = Graph.transformCoordinates(this, -len / 2, -50);
            d3.select("#tooltip")
              .text(e.label)
              .style("visibility", "visible")
              .style("opacity", "1")
              .style("left", coords.x + "px")
              .style("top", coords.y + "px");
        }
    }

    static onMouseout(e) {
        if (e.hasOwnProperty("source")) {
            d3.select(this).attr("stroke-width", Graph.get("edge_size"));
        } else {
            d3.select(this).attr("r", Graph.get("node_size"));
        }
        d3.select("#tooltip").style("visibility", "hidden").style("opacity", 0);
    }

    /* Control Callbacks*/

    static stickyNodes(sticky) {
        Graph.set("sticky", sticky);
        $("#stickynodes").prop('checked', sticky);
    }

    static showNodes(show) {
        Graph.Nodes.style("visibility", show ? "visible" : "hidden");
        $("#shownode").prop('checked', show);
    }

    static showEdges(show) {
        Graph.Edges.style("visibility", show ? "visible" : "hidden");
        $("#showlink").prop('checked', show);
    }

    static showNodeLabels(show) {
        Graph.NodeLabels.style("visibility", show ? "visible" : "hidden");
        $("#shownodelabel").prop('checked', show);
    }

    static showEdgeLabels(show) {
        Graph.EdgeLabels.style("visibility", show ? "visible" : "hidden");
        $("#showlinklabel").prop('checked', show);
    }

    static useTooltip(use) {
        Graph.set("tooltip", use);
        $("#usetooltip").prop('checked', use);
    }

    static zoom(zoom_value) {
        Graph.GRAPH.zoom_level.scaleTo(Graph.SVG, Math.round(zoom_value * 10) / 10)
        Graph.onZoom();
    }

    static toggleSimulation() { }

    static pauseSimulation() { Graph.Simulation.alphaTarget(0); }

    static resumeSimulation() { Graph.Simulation.alphaTarget(0.5); }

    static restartSimulation() { Graph.Simulation.alphaTarget(0.1).restart(); }
}

class ContextMenu {
    constructor(context_menu) {
        this.context_menu = $(context_menu);
        this.body         = this.context_menu.find(".body");
        this.anchor       = this.body.find(".dropdown-menu");
    }

    createItems(data) {
        let content = "";
        for (const [key, val] of Object.entries(data)) {
            if (isObject(val)) {
                let nested = val._empty() ? "" : "<ul class='dropdown-menu'>" + this.createItems(val) + "</ul>";
                content +=
                    `<li class="dropdown-submenu">
                        <a class="dropdown-item">${key}</a>
                        ${nested}      
                      </li>`;
            } else {
                content += `<li><a class="dropdown-item"><b>${key}</b>: ${val}</a></li>`;
            }
        }
        return content
    }

    show(x, y, element) {
        this.context_menu
            .css({
                "visibility": "visible",
                "opacity":    "1",
                "left":       x + "px",
                "top":        y + "px"
            });

        const type = "source" in element ? "edge" : "node";

        this.anchor.html("");
        this.anchor.append(`<li><a class="dropdown-item"><b>${element.label}</b></a></li>`);
        this.anchor.append("<div class='dropdown-divider'></div>");
        this.anchor.append(
            `<li class="dropdown-action" name="hazard">
              <a class="dropdown-item" onclick="Content.addHazard('${element.id}', '${type}');">Mark as Hazard</a>
            </li>`);
        this.anchor.append("<div class='dropdown-divider'></div>");
        this.anchor.append(this.createItems(element.data));
    }

    hide() {
        this.context_menu
            .css({
                "visibility": "hidden",
                "opacity":    "0"
            });
    }
}
