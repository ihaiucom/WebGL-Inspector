(function () {
    var ui = glinamespace("gli.ui");

    var ProgramView = function (w, elementRoot) {
        var self = this;
        this.window = w;
        this.elements = {
            view: elementRoot.getElementsByClassName("window-right-inner")[0]
        };

        this.currentProgram = null;
    };

    function prettyPrintSource(el, source, highlightLines) {
        var div = document.createElement("div");
        div.innerHTML = source;
        el.appendChild(div);

        var firstLine = 1;
        var firstChar = source.search(/./);
        if (firstChar > 0) {
            firstLine += firstChar;
        }

        SyntaxHighlighter.highlight({
            brush: 'glsl',
            'first-line': firstLine,
            highlight: highlightLines,
            toolbar: false
        }, div);
    };

    function generateShaderDisplay(gl, el, shader) {
        var shaderType = (shader.type == gl.VERTEX_SHADER) ? "Vertex" : "Fragment";

        var titleDiv = document.createElement("div");
        titleDiv.className = "info-title-secondary";
        titleDiv.innerHTML = shaderType + " " + shader.getName();
        el.appendChild(titleDiv);

        gli.ui.appendParameters(gl, el, shader, ["COMPILE_STATUS", "DELETE_STATUS"]);

        var highlightLines = [];
        if (shader.infoLog && shader.infoLog.length > 0) {
            var errorLines = shader.infoLog.match(/^ERROR: [0-9]+:[0-9]+: /gm);
            if (errorLines) {
                for (var n = 0; n < errorLines.length; n++) {
                    // expecting: 'ERROR: 0:LINE: '
                    var errorLine = errorLines[n];
                    errorLine = parseInt(errorLine.match(/ERROR: [0-9]+:([0-9]+): /)[1]);
                    highlightLines.push(errorLine);
                }
            }
        }

        var sourceDiv = document.createElement("div");
        sourceDiv.className = "shader-info-source";
        if (shader.source) {
            prettyPrintSource(sourceDiv, shader.source, highlightLines);
        } else {
            sourceDiv.innerHTML = "[no source uploaded]";
        }
        el.appendChild(sourceDiv);

        if (shader.infoLog && shader.infoLog.length > 0) {
            var infoDiv = document.createElement("div");
            infoDiv.className = "program-info-log";
            infoDiv.innerHTML = shader.infoLog.replace(/\n/, "<br/>");
            el.appendChild(infoDiv);
            gli.ui.appendbr(el);
        }
    };

    function appendTable(gl, el, program, name, tableData, hasValue) {
        // [ordinal, name, size, type, optional value]
        var table = document.createElement("table");
        table.className = "program-attribs";

        var tr = document.createElement("tr");
        var td = document.createElement("th");
        td.innerHTML = "ordinal";
        tr.appendChild(td);
        td = document.createElement("th");
        td.className = "program-attribs-name";
        td.innerHTML = name + " name";
        tr.appendChild(td);
        td = document.createElement("th");
        td.innerHTML = "size";
        tr.appendChild(td);
        td = document.createElement("th");
        td.className = "program-attribs-type";
        td.innerHTML = "type";
        tr.appendChild(td);
        if (hasValue) {
            td = document.createElement("th");
            td.className = "program-attribs-value";
            td.innerHTML = "value";
            tr.appendChild(td);
        }
        table.appendChild(tr);

        for (var n = 0; n < tableData.length; n++) {
            var row = tableData[n];

            var tr = document.createElement("tr");
            td = document.createElement("td");
            td.innerHTML = row[0];
            tr.appendChild(td);
            td = document.createElement("td");
            td.innerHTML = row[1];
            tr.appendChild(td);
            td = document.createElement("td");
            td.innerHTML = row[2];
            tr.appendChild(td);
            td = document.createElement("td");
            switch (row[3]) {
                case gl.FLOAT:
                    td.innerHTML = "FLOAT";
                    break;
                case gl.FLOAT_VEC2:
                    td.innerHTML = "FLOAT_VEC2";
                    break;
                case gl.FLOAT_VEC3:
                    td.innerHTML = "FLOAT_VEC3";
                    break;
                case gl.FLOAT_VEC4:
                    td.innerHTML = "FLOAT_VEC4";
                    break;
                case gl.INT:
                    td.innerHTML = "INT";
                    break;
                case gl.INT_VEC2:
                    td.innerHTML = "INT_VEC2";
                    break;
                case gl.INT_VEC3:
                    td.innerHTML = "INT_VEC3";
                    break;
                case gl.INT_VEC4:
                    td.innerHTML = "INT_VEC4";
                    break;
                case gl.BOOL:
                    td.innerHTML = "BOOL";
                    break;
                case gl.BOOL_VEC2:
                    td.innerHTML = "BOOL_VEC2";
                    break;
                case gl.BOOL_VEC3:
                    td.innerHTML = "BOOL_VEC3";
                    break;
                case gl.BOOL_VEC4:
                    td.innerHTML = "BOOL_VEC4";
                    break;
                case gl.FLOAT_MAT2:
                    td.innerHTML = "FLOAT_MAT2";
                    break;
                case gl.FLOAT_MAT3:
                    td.innerHTML = "FLOAT_MAT3";
                    break;
                case gl.FLOAT_MAT4:
                    td.innerHTML = "FLOAT_MAT4";
                    break;
                case gl.SAMPLER_2D:
                    td.innerHTML = "SAMPLER_2D";
                    break;
                case gl.SAMPLER_CUBE:
                    td.innerHTML = "SAMPLER_CUBE";
                    break;
            }
            tr.appendChild(td);
            if (hasValue) {
                td = document.createElement("td");
                td.innerHTML = row[4];
                tr.appendChild(td);
            }
            table.appendChild(tr);
        }

        el.appendChild(table);
    };

    function appendUniformInfos(gl, el, program) {
        var tableData = [];
        var uniformCount = program.parameters[gl.ACTIVE_UNIFORMS];
        for (var n = 0; n < uniformCount; n++) {
            var activeInfo = gl.getActiveUniform(program.target, n);
            if (activeInfo) {
                var loc = gl.getUniformLocation(program.target, activeInfo.name);
                var value = gl.getUniform(program.target, loc);
                tableData.push([n, activeInfo.name, activeInfo.size, activeInfo.type, value]);
            }
            gl.ignoreErrors();
        }
        appendTable(gl, el, program, "uniform", tableData, true);
    };

    function appendAttributeInfos(gl, el, program) {
        var tableData = [];
        var remainingAttribs = program.parameters[gl.ACTIVE_ATTRIBUTES];
        var maxAttribs = gl.getParameter(gl.MAX_VERTEX_ATTRIBS);
        var attribIndex = 0;
        while (remainingAttribs > 0) {
            var activeInfo = gl.getActiveAttrib(program.target, attribIndex);
            if (activeInfo && activeInfo.type) {
                remainingAttribs--;
                tableData.push([attribIndex, activeInfo.name, activeInfo.size, activeInfo.type]);
            }
            gl.ignoreErrors();
            attribIndex++;
            if (attribIndex >= maxAttribs) {
                break;
            }
        }
        appendTable(gl, el, program, "attribute", tableData, false);
    };

    function generateProgramDisplay(gl, el, program) {
        var titleDiv = document.createElement("div");
        titleDiv.className = "info-title-master";
        titleDiv.innerHTML = program.getName();
        el.appendChild(titleDiv);

        gli.ui.appendParameters(gl, el, program, ["LINK_STATUS", "VALIDATE_STATUS", "DELETE_STATUS", "ACTIVE_UNIFORMS", "ACTIVE_ATTRIBUTES"]);
        gli.ui.appendbr(el);

        if (program.parameters[gl.ACTIVE_UNIFORMS] > 0) {
            appendUniformInfos(gl, el, program);
            gli.ui.appendbr(el);
        }
        if (program.parameters[gl.ACTIVE_ATTRIBUTES] > 0) {
            appendAttributeInfos(gl, el, program);
            gli.ui.appendbr(el);
        }

        if (program.infoLog && program.infoLog.length > 0) {
            var infoDiv = document.createElement("div");
            infoDiv.className = "program-info-log";
            infoDiv.innerHTML = program.infoLog.replace(/\n/, "<br/>");
            el.appendChild(infoDiv);
            gli.ui.appendbr(el);
        }

        var vertexShader = program.getVertexShader(gl);
        var fragmentShader = program.getFragmentShader(gl);
        if (vertexShader) {
            var vertexShaderDiv = document.createElement("div");
            gli.ui.appendSeparator(el);
            generateShaderDisplay(gl, el, vertexShader);
        }
        if (fragmentShader) {
            var fragmentShaderDiv = document.createElement("div");
            gli.ui.appendSeparator(el);
            generateShaderDisplay(gl, el, fragmentShader);
        }
    };

    ProgramView.prototype.setProgram = function (program) {
        this.elements.view.innerHTML = "";
        if (program) {
            generateProgramDisplay(this.window.context, this.elements.view, program);
        }

        this.elements.view.scrollTop = 0;
    };

    ui.ProgramView = ProgramView;
})();
