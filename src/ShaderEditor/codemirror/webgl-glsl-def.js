    function words(str) {
        var obj = {},
            words = str.split(" ");
        for (var i = 0; i < words.length; ++i) obj[words[i]] = true;
        return obj;
    }

    function cppHook(stream, state) {
        if (!state.startOfLine) return false
        for (var ch, next = null; ch = stream.peek();) {
            if (ch == "\\" && stream.match(/^.$/)) {
                next = cppHook
                break;
            } else if (ch == "/" && stream.match(/^\/[\/\*]/, false)) {
                break;
            }
            stream.next()
        }
        state.tokenize = next;
        return "meta";
    }

    function def(mimes, mode) {
        if (typeof mimes == "string") mimes = [mimes];
        var words = [];

        function add(obj) {
            if (obj)
                for (var prop in obj)
                    if (obj.hasOwnProperty(prop))
                        words.push(prop);
        }
        add(mode.keywords);
        add(mode.types);
        add(mode.builtin);
        add(mode.atoms);
        if (words.length) {
            mode.helperType = mimes[0];
            CodeMirror.registerHelper("hintWords", mimes[0], words);
        }

        for (var i = 0; i < mimes.length; ++i)
            CodeMirror.defineMIME(mimes[i], mode);
    }

    CodeMirror.registerHelper("fold", "define", function(cm, start) {
        function hasIf(line) {
            if (line < cm.firstLine() || line > cm.lastLine()) return null;
            var start = cm.getTokenAt(CodeMirror.Pos(line, 1));
            if (!/\S/.test(start.string)) start = cm.getTokenAt(CodeMirror.Pos(line, start.end + 1));
            if (start.type == "meta" && start.string.slice(0, 3) == "#if") return start.length;
            return null;
        }

        function hasEndIf(line) {
            if (line < cm.firstLine() || line > cm.lastLine()) return null;
            var start = cm.getTokenAt(CodeMirror.Pos(line, 1));
            if (!/\S/.test(start.string)) start = cm.getTokenAt(CodeMirror.Pos(line, start.end + 1));
            if (start.type === "meta" && start.string.slice(0, 6) === "#endif") return start.start + 6;
            return null;
        }

        var startLine = start.line,
            has = hasIf(startLine);
        if (has === null) return null;
        for (var end = startLine;;) {
            var next = hasEndIf(end + 1);
            if (next !== null) break;
            ++end;
        }
        return {
            from: CodeMirror.Pos(startLine, has),
            to: cm.clipPos(CodeMirror.Pos(end + 1))
        };
    });


    def(["text/x-essl"], {
        name: "clike",
        keywords: words("sampler1D sampler2D sampler3D samplerCube " +
            "const attribute uniform varying " +
            "break continue discard return " +
            "for while do if else struct " +
            "lowp highp mediump " +
            "in out inout precision invariant discard " +

            "layout location " +

            "#define #undef #pragma"),

        types: words("float int bool void " +
            "vec2 vec3 vec4 ivec2 ivec3 ivec4 bvec2 bvec3 bvec4 " +
            "mat2 mat3 mat4"),

        blockKeywords: words("for while do if else struct "),

        builtin: words("radians degrees sin cos tan asin acos atan " +
            "pow exp log log2 exp2 sqrt inversesqrt " +
            "abs sign floor ceil fract mod min max clamp mix step smoothstep " +
            "length distance dot cross normalize ftransform faceforward " +
            "reflect refract matrixCompMult " +
            "lessThan lessThanEqual greaterThan greaterThanEqual " +
            "equal notEqual any all not " +
            "texture2D texture2DProj texture2DLod texture2DProjLod " +
            "textureCube textureCubeLod " +
            "dFdx dFdy fwidth " +

            "cosh tanh sinh asinh acosh atanh " + 
            "round roundEven " +
            "isNaN isInf floatBitsToInt floatBitsToUint intBitsToFloat uintBitsToFloat" +
            "packSnorm2x16 packUnorm2x16 unpackSnorm2x16 unpackUnorm2x16 packHalf2x16 unpackHalf2x16 " +
            "transpose inverse determinant outerProduct matrixCompMult" +
            "texture textureProj textureLod textureOffset texelFetch texelFetchOffset " +
            "textureProjOffset textureLodOffset textureProjLod textureProjLodOffset " +
            "textureGrad textureGradOffset textureProjGrad textureProjGradOffset" +
            "textureSize"),

        atoms: words("true false " +
            "gl_FragColor " +
            "gl_PointCoord " +
            "gl_Position gl_PointSize " +
            "gl_TexCoord " +
            "gl_FragCoord gl_FrontFacing " +
            "gl_FragDepthEXT " +
            "gl_DepthRange " +
            "gl_Point " +
            "gl_MaxTextureUnits gl_MaxTextureCoords " +
            "gl_MaxVertexAttribs gl_MaxVertexUniformComponents gl_MaxVaryingFloats " +
            "gl_MaxVertexTextureImageUnits gl_MaxTextureImageUnits " +
            "gl_MaxFragmentUniformComponents gl_MaxCombineTextureImageUnits " +
            "gl_MaxDrawBuffers " +

            "gl_VertexID gl_InstanceID " +
            "gl_MinProgramTexelOffset gl_MaxProgramTexelOffset"
        ),

        indentSwitch: false,

        hooks: {
            "#": cppHook
        },

        modeProps: {
            fold: ["brace", "define"]
        }
    });