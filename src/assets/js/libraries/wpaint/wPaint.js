/*! wPaint - v2.5.0 - 2014-03-01 */ !(function (a) {
    console.log('wpaint.js');
    "use strict";
    function b(b, c) {
        (this.$el = a(b)),
            (this.options = c),
            (this.init = !1),
            (this.menus = { primary: null, active: null, all: {} }),
            (this.previousMode = null),
            (this.width = this.$el.width()),
            (this.height = this.$el.height()),
            (this.ctxBgResize = !1),
            (this.ctxResize = !1),
            this.generate(),
            this._init();
    }
    function c(a, b, c) {
        (this.wPaint = a), (this.options = c), (this.name = b), (this.type = a.menus.primary ? "secondary" : "primary"), (this.docked = !0), (this.dockOffset = { left: 0, top: 0 }), this.generate();
    }
    (b.prototype = {
        generate: function () {
            function b(b) {
                var c = b ? b.capitalize() : "",
                    d = "canvas" + c,
                    e = "ctx" + c;
                return (
                    (f[d] = document.createElement("canvas")),
                    (f[e] = f[d].getContext("2d")),
                    (f["$" + d] = a(f[d])),
                    f["$" + d]
                        .attr("class", "wPaint-canvas" + (b ? "-" + b : ""))
                        .attr("width", f.width + "px")
                        .attr("height", f.height + "px")
                        .css({ position: "absolute", left: 0, top: 0 }),
                    f.$el.append(f["$" + d]),
                    f["$" + d]
                );
            }
            function c(a) {
                a.preventDefault(), a.stopPropagation(), (f.draw = !0), (a.canvasEvent = "down"), f._closeSelectBoxes(), f._callShapeFunc.apply(f, [a]);
            }
            function d(a) {
                f.draw && ((a.canvasEvent = "move"), f._callShapeFunc.apply(f, [a]));
            }
            function e(a) {
                f.draw && ((f.draw = !1), (a.canvasEvent = "up"), f._callShapeFunc.apply(f, [a]));
            }
            if (this.init) return this;
            var f = this;
            b("bg"), b("").on("mousedown", c).bindMobileEvents(), b("temp").hide(), a(document).on("mousemove", d).on("mousedown", a.proxy(this._closeSelectBoxes, this)).on("mouseup", e), this.setTheme(this.options.theme);
        },
        _init: function () {
            var a = null,
                b = null;
            this.init = !0;
            for (a in this.options) (b = "set" + a.capitalize()), this[b] && this[b](this.options[a]);
            this._fixMenus(), this.menus.primary._getIcon(this.options.mode).trigger("click");
        },
        resize: function () {
            var a = this.getBg(),
                b = this.getImage();
            (this.width = this.$el.width()),
                (this.height = this.$el.height()),
                (this.canvasBg.width = this.width),
                (this.canvasBg.height = this.height),
                (this.canvas.width = this.width),
                (this.canvas.height = this.height),
                this.ctxBgResize === !1 && ((this.ctxBgResize = !0), this.setBg(a, !0)),
                this.ctxResize === !1 && ((this.ctxResize = !0), this.setImage(b, "", !0, !0));
        },
        setTheme: function (a) {
            var b, c;
            for (a = a.split(" "), this.$el.attr("class", (this.$el.attr("class") || "").replace(/wPaint-theme-.+\s|wPaint-theme-.+$/, "")), b = 0, c = a.length; c > b; b++) this.$el.addClass("wPaint-theme-" + a[b]);
        },
        setMode: function (a) {
            this.setCursor(a), (this.previousMode = this.options.mode), (this.options.mode = a);
        },
        setImage: function (b, c, d, e) {
            function f() {
                var a = 1,
                    b = 0,
                    f = 0,
                    j = 0,
                    k = 0,
                    l = h.width,
                    m = h.height;
                d ||
                    ((h.width > g.width || h.height > g.height || g.options.imageStretch) && ((b = g.width / h.width), (f = g.height / h.height), (a = f > b ? b : f), (l = h.width * a), (m = h.height * a)),
                    (j = (g.width - l) / 2),
                    (k = (g.height - m) / 2)),
                    i.clearRect(0, 0, g.width, g.height),
                    i.drawImage(h, j, k, l, m),
                    (g[c + "Resize"] = !1),
                    e || g._addUndo();
            }
            if (!b) return !0;
            var g = this,
                h = null,
                i = "";
            (c = "ctx" + (c || "").capitalize()),
                (i = this[c]),
                window.rgbHex(b) ? (i.clearRect(0, 0, this.width, this.height), (i.fillStyle = b), i.rect(0, 0, this.width, this.height), i.fill()) : ((h = new Image()), (h.src = b.toString()), a(h).load(f));
        },
        setBg: function (a, b) {
            return a ? void this.setImage(a, "bg", b, !0) : !0;
        },
        setCursor: function (b) {
            (b = a.fn.wPaint.cursors[b] || a.fn.wPaint.cursors["default"]), this.$el.css("cursor", 'url("' + this.options.path + b.path + '") ' + b.left + " " + b.top + ", default");
        },
        setMenuOrientation: function (b) {
            a.each(this.menus.all, function (a, c) {
                (c.options.aligment = b), c.setAlignment(b);
            });
        },
        getImage: function (b) {
            var c = document.createElement("canvas"),
                d = c.getContext("2d");
            return (
                (b = b === !1 ? !1 : !0),
                a(c).css({ display: "none", position: "absolute", left: 0, top: 0 }).attr("width", this.width).attr("height", this.height),
                b && d.drawImage(this.canvasBg, 0, 0),
                d.drawImage(this.canvas, 0, 0),
                c.toDataURL()
            );
        },
        getBg: function () {
            return this.canvasBg.toDataURL();
        },
        _displayStatus: function (b) {
            var c = this;
            this.$status || ((this.$status = a('<div class="wPaint-status"></div>')), this.$el.append(this.$status)),
                this.$status.html(b),
                clearTimeout(this.displayStatusTimer),
                this.$status.fadeIn(500, function () {
                    c.displayStatusTimer = setTimeout(function () {
                        c.$status.fadeOut(500);
                    }, 1500);
                });
        },
        _showModal: function (a) {
            function b() {
                d.remove(), e.remove(), c._createModal(a);
            }
            var c = this,
                d = this.$el.children(".wPaint-modal-bg"),
                e = this.$el.children(".wPaint-modal");
            d.length ? e.fadeOut(500, b) : this._createModal(a);
        },
        _createModal: function (b) {
            function c() {
                f.fadeOut(500, d);
            }
            function d() {
                e.remove(), f.remove();
            }
            b = a('<div class="wPaint-modal-content"></div>').append(b.children());
            var e = a('<div class="wPaint-modal-bg"></div>'),
                f = a('<div class="wPaint-modal"></div>'),
                g = a('<div class="wPaint-modal-holder"></div>'),
                h = a('<div class="wPaint-modal-close">X</div>');
            h.on("click", c), f.append(g.append(b)).append(h), this.$el.append(e).append(f), f.css({ left: this.$el.outerWidth() / 2 - f.outerWidth(!0) / 2, top: this.$el.outerHeight() / 2 - f.outerHeight(!0) / 2 }), f.fadeIn(500);
        },
        _createMenu: function (a, b) {
            return (b = b || {}), (b.alignment = this.options.menuOrientation), (b.handle = this.options.menuHandle), new c(this, a, b);
        },
        _fixMenus: function () {
            function b(b, d) {
                var e = a(d),
                    f = e.clone();
                f.appendTo(c.$el), f.outerHeight() === f.get(0).scrollHeight && e.css({ overflowY: "auto" }), f.remove();
            }
            var c = this,
                d = null;
            for (var e in this.menus.all) (d = c.menus.all[e].$menu.find(".wPaint-menu-select-holder")), d.length && d.children().each(b);
        },
        _closeSelectBoxes: function (a) {
            var b, c;
            for (b in this.menus.all) (c = this.menus.all[b].$menuHolder.children(".wPaint-menu-icon-select")), a && (c = c.not(".wPaint-menu-icon-name-" + a.name)), c.children(".wPaint-menu-select-holder").hide();
        },
        _callShapeFunc: function (a) {
            var b = this.$canvas.offset(),
                c = a.canvasEvent.capitalize(),
                d = "_draw" + this.options.mode.capitalize() + c;
            (a.pageX = Math.floor(a.pageX - b.left)),
                (a.pageY = Math.floor(a.pageY - b.top)),
                this[d] && this[d].apply(this, [a]),
                this.options["draw" + c] && this.options["_draw" + c].apply(this, [a]),
                "Down" === c && this.options.onShapeDown
                    ? this.options.onShapeDown.apply(this, [a])
                    : "Move" === c && this.options.onShapeMove
                    ? this.options.onShapeMove.apply(this, [a])
                    : "Up" === c && this.options.onShapeUp && this.options.onShapeUp.apply(this, [a]);
        },
        _stopPropagation: function (a) {
            a.stopPropagation();
        },
        _drawShapeDown: function (a) {
            this.$canvasTemp.css({ left: a.PageX, top: a.PageY }).attr("width", 0).attr("height", 0).show(), (this.canvasTempLeftOriginal = a.pageX), (this.canvasTempTopOriginal = a.pageY);
        },
        _drawShapeMove: function (b, c) {
            var d = this.canvasTempLeftOriginal,
                e = this.canvasTempTopOriginal;
            (c = c || 2),
                (b.left = b.pageX < d ? b.pageX : d),
                (b.top = b.pageY < e ? b.pageY : e),
                (b.width = Math.abs(b.pageX - d)),
                (b.height = Math.abs(b.pageY - e)),
                (b.x = (this.options.lineWidth / 2) * c),
                (b.y = (this.options.lineWidth / 2) * c),
                (b.w = b.width - this.options.lineWidth * c),
                (b.h = b.height - this.options.lineWidth * c),
                a(this.canvasTemp).css({ left: b.left, top: b.top }).attr("width", b.width).attr("height", b.height),
                (this.canvasTempLeftNew = b.left),
                (this.canvasTempTopNew = b.top),
                (c = c || 2),
                (this.ctxTemp.fillStyle = this.options.fillStyle),
                (this.ctxTemp.strokeStyle = this.options.strokeStyle),
                (this.ctxTemp.lineWidth = this.options.lineWidth * c);
        },
        _drawShapeUp: function () {
            this.ctx.drawImage(this.canvasTemp, this.canvasTempLeftNew, this.canvasTempTopNew), this.$canvasTemp.hide();
        },
        _drawDropperDown: function (a) {
            var b = { x: a.pageX, y: a.pageY },
                c = this._getPixel(this.ctx, b),
                d = null;
            (d = "rgba(" + [c.r, c.g, c.b, c.a].join(",") + ")"), (this.options[this.dropper] = d), this.menus.active._getIcon(this.dropper).wColorPicker("color", d);
        },
        _drawDropperUp: function () {
            this.setMode(this.previousMode);
        },
        _getPixel: function (a, b) {
            var c = a.getImageData(0, 0, this.width, this.height),
                d = c.data,
                e = 4 * (b.y * c.width + b.x);
            return { r: d[e], g: d[e + 1], b: d[e + 2], a: d[e + 3] };
        },
    }),
        (c.prototype = {
            generate: function () {
                (this.$menu = a('<div class="wPaint-menu"></div>')),
                    (this.$menuHolder = a('<div class="wPaint-menu-holder wPaint-menu-name-' + this.name + '"></div>')),
                    this.options.handle ? (this.$menuHandle = this._createHandle()) : this.$menu.addClass("wPaint-menu-nohandle"),
                    "primary" === this.type ? ((this.wPaint.menus.primary = this), this.setOffsetLeft(this.options.offsetLeft), this.setOffsetTop(this.options.offsetTop)) : "secondary" === this.type && this.$menu.hide(),
                    this.$menu.append(this.$menuHolder.append(this.$menuHandle)),
                    this.reset(),
                    this.wPaint.$el.append(this.$menu),
                    this.setAlignment(this.options.alignment);
            },
            reset: function () {
                function b(a) {
                    d._appendItem(a);
                }
                var c,
                    d = this,
                    e = a.fn.wPaint.menus[this.name];
                for (c in e.items) this.$menuHolder.children(".wPaint-menu-icon-name-" + c).length || ((e.items[c].name = c), (e.items[c].img = d.wPaint.options.path + (e.items[c].img || e.img)), b(e.items[c]));
            },
            _appendItem: function (a) {
                var b = this["_createIcon" + a.icon.capitalize()](a);
                a.after ? this.$menuHolder.children(".wPaint-menu-icon-name-" + a.after).after(b) : this.$menuHolder.append(b);
            },
            setOffsetLeft: function (a) {
                this.$menu.css({ left: a });
            },
            setOffsetTop: function (a) {
                this.$menu.css({ top: a });
            },
            setAlignment: function (a) {
                var b = this.$menu.css("left");
                this.$menu.attr("class", this.$menu.attr("class").replace(/wPaint-menu-alignment-.+\s|wPaint-menu-alignment-.+$/, "")),
                    this.$menu.addClass("wPaint-menu-alignment-" + a),
                    this.$menu.width("auto").css("left", -1e4),
                    this.$menu.width(this.$menu.width()).css("left", b),
                    "secondary" === this.type && ("horizontal" === this.options.alignment ? (this.dockOffset.top = this.wPaint.menus.primary.$menu.outerHeight(!0)) : (this.dockOffset.left = this.wPaint.menus.primary.$menu.outerWidth(!0)));
            },
            _createHandle: function () {
                function b() {
                    (e.docked = !1), e._setDrag();
                }
                function c() {
                    a.each(e.$menu.data("ui-draggable").snapElements, function (a, b) {
                        var c = e.$menu.offset(),
                            d = e.wPaint.menus.primary.$menu.offset();
                        (e.dockOffset.left = c.left - d.left), (e.dockOffset.top = c.top - d.top), (e.docked = b.snapping);
                    }),
                        e._setDrag();
                }
                function d() {
                    e._setIndex();
                }
                var e = this,
                    f = a('<div class="wPaint-menu-handle"></div>');
                return (
                    this.$menu.draggable({ handle: f }),
                    "secondary" === this.type &&
                        (this.$menu.draggable("option", "snap", this.wPaint.menus.primary.$menu), this.$menu.draggable("option", "start", b), this.$menu.draggable("option", "stop", c), this.$menu.draggable("option", "drag", d)),
                    f.bindMobileEvents(),
                    f
                );
            },
            _createIconBase: function (b) {
                function c(b) {
                    var c = a(b.currentTarget);
                    c.siblings(".hover").removeClass("hover"), c.hasClass("disabled") || c.addClass("hover");
                }
                function d(b) {
                    a(b.currentTarget).removeClass("hover");
                }
                function e() {
                    f.wPaint.menus.active = f;
                }
                var f = this,
                    g = a('<div class="wPaint-menu-icon wPaint-menu-icon-name-' + b.name + '"></div>'),
                    h = a('<div class="wPaint-menu-icon-img"></div>'),
                    i = h.realWidth(null, null, this.wPaint.$el);
                return (
                    g.attr("title", b.title).on("mousedown", a.proxy(this.wPaint._closeSelectBoxes, this.wPaint, b)).on("mouseenter", c).on("mouseleave", d).on("click", e),
                    a.isNumeric(b.index) && h.css({ backgroundImage: "url(" + b.img + ")", backgroundPosition: -i * b.index + "px 0px" }),
                    g.append(h)
                );
            },
            _createIconGroup: function (b) {
                function c() {
                    h.children(".wPaint-menu-select-holder").is(":visible") || b.callback.apply(f.wPaint, []);
                }
                function d() {
                    h.addClass("active").siblings(".active").removeClass("active");
                }
                function e() {
                    h.attr("title", b.title).off("click.setIcon").on("click.setIcon", c), h.children(".wPaint-menu-icon-img").css(g), b.callback.apply(f.wPaint, []);
                }
                var f = this,
                    g = { backgroundImage: "url(" + b.img + ")" },
                    h = this.$menuHolder.children(".wPaint-menu-icon-group-" + b.group),
                    i = h.length,
                    j = null,
                    k = null,
                    l = null,
                    m = 0;
                return (
                    i ||
                        (h = this._createIconBase(b)
                            .addClass("wPaint-menu-icon-group wPaint-menu-icon-group-" + b.group)
                            .on("click.setIcon", c)
                            .on("mousedown", a.proxy(this._iconClick, this))),
                    (m = h.children(".wPaint-menu-icon-img").realWidth(null, null, this.wPaint.$el)),
                    (g.backgroundPosition = -m * b.index + "px center"),
                    (j = h.children(".wPaint-menu-select-holder")),
                    j.length || ((j = this._createSelectBox(h)), j.children().on("click", d)),
                    (l = a('<div class="wPaint-menu-icon-select-img"></div>').attr("title", b.title).css(g)),
                    (k = this._createSelectOption(j, l)
                        .addClass("wPaint-menu-icon-name-" + b.name)
                        .on("click", e)),
                    b.after &&
                        j
                            .children(".wPaint-menu-select")
                            .children(".wPaint-menu-icon-name-" + b.after)
                            .after(k),
                    i ? void 0 : h
                );
            },
            _createIconGeneric: function (a) {
                return this._createIconActivate(a);
            },
            _createIconActivate: function (a) {
                function b(b) {
                    "generic" !== a.icon && c._iconClick(b), a.callback.apply(c.wPaint, [b]);
                }
                if (a.group) return this._createIconGroup(a);
                var c = this,
                    d = this._createIconBase(a);
                return d.on("click", b), d;
            },
            _isIconDisabled: function (a) {
                return this.$menuHolder.children(".wPaint-menu-icon-name-" + a).hasClass("disabled");
            },
            _setIconDisabled: function (a, b) {
                var c = this.$menuHolder.children(".wPaint-menu-icon-name-" + a);
                b ? c.addClass("disabled").removeClass("hover") : c.removeClass("disabled");
            },
            _getIcon: function (a) {
                return this.$menuHolder.children(".wPaint-menu-icon-name-" + a);
            },
            _iconClick: function (b) {
                var c = a(b.currentTarget),
                    d = this.wPaint.menus.all;
                for (var e in d) d[e] && "secondary" === d[e].type && d[e].$menu.hide();
                c.siblings(".active").removeClass("active"), c.hasClass("disabled") || c.addClass("active");
            },
            _createIconToggle: function (a) {
                function b() {
                    d.toggleClass("active"), a.callback.apply(c.wPaint, [d.hasClass("active")]);
                }
                var c = this,
                    d = this._createIconBase(a);
                return d.on("click", b), d;
            },
            _createIconSelect: function (b) {
                function c(c) {
                    h.children(".wPaint-menu-icon-img").html(a(c.currentTarget).html()), b.callback.apply(g.wPaint, [a(c.currentTarget).html()]);
                }
                var d,
                    e,
                    f,
                    g = this,
                    h = this._createIconBase(b),
                    i = this._createSelectBox(h);
                for (d = 0, e = b.range.length; e > d; d++) (f = this._createSelectOption(i, b.range[d])), f.on("click", c), b.useRange && f.css(b.name, b.range[d]);
                return h;
            },
            _createSelectBox: function (b) {
                function c(a) {
                    a.stopPropagation(), g.hide();
                }
                function d() {
                    i = setTimeout(function () {
                        g.toggle();
                    }, 200);
                }
                function e() {
                    clearTimeout(i);
                }
                function f() {
                    g.toggle();
                }
                var g = a('<div class="wPaint-menu-select-holder"></div>'),
                    h = a('<div class="wPaint-menu-select"></div>'),
                    i = null;
                return (
                    g.on("mousedown mouseup", this.wPaint._stopPropagation).on("click", c).hide(),
                    g.css(
                        "horizontal" === this.options.alignment
                            ? { left: 0, top: b.children(".wPaint-menu-icon-img").realHeight("outer", !0, this.wPaint.$el) }
                            : { left: b.children(".wPaint-menu-icon-img").realWidth("outer", !0, this.wPaint.$el), top: 0 }
                    ),
                    b.addClass("wPaint-menu-icon-select").append('<div class="wPaint-menu-icon-group-arrow"></div>').append(g.append(h)),
                    b.hasClass("wPaint-menu-icon-group") ? b.on("mousedown", d).on("mouseup", e) : b.on("click", f),
                    g
                );
            },
            _createSelectOption: function (b, c) {
                var d = b.children(".wPaint-menu-select"),
                    e = a('<div class="wPaint-menu-select-option"></div>').append(c);
                return d.children().length || e.addClass("first"), d.append(e), e;
            },
            _setSelectValue: function (a, b) {
                this._getIcon(a).children(".wPaint-menu-icon-img").html(b);
            },
            _createIconColorPicker: function (a) {
                function b() {
                    "dropper" === e.wPaint.options.mode && e.wPaint.setMode(e.wPaint.previousMode);
                }
                function c(b) {
                    a.callback.apply(e.wPaint, [b]);
                }
                function d() {
                    f.trigger("click"), (e.wPaint.dropper = a.name), e.wPaint.setMode("dropper");
                }
                var e = this,
                    f = this._createIconBase(a);
                return f.on("click", b).addClass("wPaint-menu-colorpicker").wColorPicker({ mode: "click", generateButton: !1, dropperButton: !0, onSelect: c, onDropper: d }), f;
            },
            _setColorPickerValue: function (a, b) {
                this._getIcon(a).children(".wPaint-menu-icon-img").css("backgroundColor", b);
            },
            _createIconMenu: function (a) {
                function b() {
                    c.wPaint.setCursor(a.name);
                    var b = c.wPaint.menus.all[a.name];
                    b.$menu.toggle(), c.handle ? b._setDrag() : b._setPosition();
                }
                var c = this,
                    d = this._createIconActivate(a);
                return d.on("click", b), d;
            },
            _setDrag: function () {
                var b = this.$menu,
                    c = null,
                    d = null;
                b.is(":visible") &&
                    (this.docked && ((c = d = a.proxy(this._setPosition, this)), this._setPosition()), this.wPaint.menus.primary.$menu.draggable("option", "drag", c), this.wPaint.menus.primary.$menu.draggable("option", "stop", d));
            },
            _setPosition: function () {
                var a = this.wPaint.menus.primary.$menu.position();
                this.$menu.css({ left: a.left + this.dockOffset.left, top: a.top + this.dockOffset.top });
            },
            _setIndex: function () {
                var a = this.wPaint.menus.primary.$menu.offset(),
                    b = this.$menu.offset();
                b.top < a.top || b.left < a.left ? this.$menu.addClass("wPaint-menu-behind") : this.$menu.removeClass("wPaint-menu-behind");
            },
        }),
        (a.support.canvas = document.createElement("canvas").getContext),
        (a.fn.wPaint = function (c, d) {
            function e() {
                return a.support.canvas ? a.proxy(f, this)() : (a(this).html("Browser does not support HTML5 canvas, please upgrade to a more modern browser."), !1);
            }
            function f() {
                var d = a.data(this, "wPaint");
                return d || ((d = new b(this, a.extend(!0, {}, c))), a.data(this, "wPaint", d)), d;
            }
            function g() {
                var b = a.data(this, "wPaint");
                b && (b[c] ? b[c].apply(b, [d]) : void 0 !== d ? (b[i] && b[i].apply(b, [d]), b.options[c] && (b.options[c] = d)) : h.push(b[i] ? b[i].apply(b, [d]) : b.options[c] ? b.options[c] : void 0));
            }
            if ("string" == typeof c) {
                var h = [],
                    i = (d ? "set" : "get") + c.charAt(0).toUpperCase() + c.substring(1);
                return this.each(g), h.length ? (1 === h.length ? h[0] : h) : this;
            }
            return (c = a.extend({}, a.fn.wPaint.defaults, c)), (c.lineWidth = parseInt(c.lineWidth, 10)), (c.fontSize = parseInt(c.fontSize, 10)), this.each(e);
        }),
        (a.fn.wPaint.extend = function (a, d) {
            function e(c) {
                if (d[c]) {
                    var e = b.prototype[c],
                        f = a[c];
                    d[c] = function () {
                        e.apply(this, arguments), f.apply(this, arguments);
                    };
                } else d[c] = a[c];
            }
            var f;
            d = "menu" === d ? c.prototype : b.prototype;
            for (f in a) e(f);
        }),
        (a.fn.wPaint.menus = {}),
        (a.fn.wPaint.cursors = {}),
        (a.fn.wPaint.defaults = {
            path: "/",
            theme: "standard classic",
            autoScaleImage: !0,
            autoCenterImage: !0,
            menuHandle: !0,
            menuOrientation: "horizontal",
            menuOffsetLeft: 5,
            menuOffsetTop: 5,
            bg: null,
            image: null,
            imageStretch: !1,
            onShapeDown: null,
            onShapeMove: null,
            onShapeUp: null,
        });
})(jQuery_1_10_2),
    (function () {
        String.prototype.capitalize ||
            (String.prototype.capitalize = function () {
                return this.slice(0, 1).toUpperCase() + this.slice(1);
            });
    })(),
    (function (a) {
        (a.fn.realWidth = function (b, c, d) {
            var e = null,
                f = null,
                g = null;
            return (
                (b = "inner" === b || "outer" === b ? b : ""),
                (g = "" === b ? "width" : b + "Width"),
                (c = c === !0 ? !0 : !1),
                (f = a(this)
                    .clone()
                    .css({ position: "absolute", left: -1e4 })
                    .appendTo(d || "body")),
                (e = c ? f[g](c) : f[g]()),
                f.remove(),
                e
            );
        }),
            (a.fn.realHeight = function (b, c, d) {
                var e = null,
                    f = null,
                    g = null;
                return (
                    (b = "inner" === b || "outer" === b ? b : ""),
                    (g = "" === b ? "height" : b + "Height"),
                    (c = c === !0 ? !0 : !1),
                    (f = a(this)
                        .clone()
                        .css({ position: "absolute", left: -1e4 })
                        .appendTo(d || "body")),
                    (e = c ? f[g](c) : f[g]()),
                    f.remove(),
                    e
                );
            }),
            (a.fn.bindMobileEvents = function () {
                a(this).on("touchstart touchmove touchend touchcancel", function () {
                    var a = event.changedTouches || event.originalEvent.targetTouches,
                        b = a[0],
                        c = "";
                    switch (event.type) {
                        case "touchstart":
                            c = "mousedown";
                            break;
                        case "touchmove":
                            (c = "mousemove"), event.preventDefault();
                            break;
                        case "touchend":
                            c = "mouseup";
                            break;
                        default:
                            return;
                    }
                    var d = document.createEvent("MouseEvent");
                    d.initMouseEvent(c, !0, !0, window, 1, b.screenX, b.screenY, b.clientX, b.clientY, !1, !1, !1, !1, 0, null), b.target.dispatchEvent(d);
                });
            });
    })(jQuery_1_10_2);
