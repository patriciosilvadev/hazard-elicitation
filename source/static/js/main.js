String.prototype.format = function () {
    let i = 0, args = arguments;
    return this.replace(/{}/g, function () {
        return typeof args[i] != 'undefined' ? args[i++] : '';
    });
};

String.prototype.parseBool = function () {
    return !this.toLowerCase().startsWith("f");
}

Object.defineProperty(Object.prototype, '_keys', {
    value:      function () { return Object.keys(this); },
    enumerable: false
});

Object.defineProperty(Object.prototype, '_values', {
    value:      function () { return Object.keys(this).map(k => this[k]); },
    enumerable: false
});

Object.defineProperty(Object.prototype, '_entries', {
    value:      function () { return Object.entries(this); },
    enumerable: false
});

Object.defineProperty(Object.prototype, '_empty', {
    value:      function () { return Object.keys(this).length === 0; },
    enumerable: false
});

function isString(what) { return typeof what === "string"; }

function isObject(what) { return typeof what === "object"; }

function isBool(what) { return typeof what === "boolean"; }

function time(date) {
    return "{}-{}-{} {}:{}:{}".format(
        date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(),
        date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds())
}

function formattedStack(...args) {
    const date   = new Date();
    const stack  = new Error().stack.split("\n");
    const parent = stack[stack.length - 2];
    const start  = parent.lastIndexOf("/") + 1;
    const file   = parent.substr(start, parent.length - start - 1);
    return ["{} [{}] | {}:".format(time(date), file, args[0]), ...args.slice(1)];
}

function dir() {
    console.dir(...formattedStack("DEBUG  ", ...arguments))
}

function debug() {
    console.debug(...formattedStack("DEBUG  ", ...arguments))
}

function info() {
    console.info(...formattedStack("INFO   ", ...arguments))
}

function warn() {
    console.warn(...formattedStack("WARNING", ...arguments))
}

function error(what) {
    console.error(...formattedStack("ERROR  ", ...arguments))
}

function setConfig(key, value) {
    if (isBool(value))
        localStorage.setItem(key, value ? "1" : "0");
    else
        localStorage.setItem(key, value);
}

function getConfig(key) {
    return localStorage.getItem(key);
}

function setDarkTheme(value) {
    setConfig("dark-theme", value);
    document.documentElement.className       = value ? "dark-theme" : "light-theme";
    document.getElementById("theme").checked = value;
}

function loadTheme() {
    let dark_mode                            = getConfig("dark-theme") !== "0";
    document.getElementById("theme").checked = dark_mode;
    setDarkTheme(dark_mode);
}

function showAdvancedElements(show) {
    const elements = $(".advanced");
    show ? elements.css("display", "inline-block") : elements.css("display", "none");
}

function splitAreas() {
    Split(['#left', '#bot'], {
        sizes:      [75, 25],
        minSize:    [525, 375],
        gutterSize: 5,
        cursor:     'col-resize'
    })

    Split(['#arch', '#content'], {
        sizes:      [65, 35],
        minSize:    [600, 300],
        gutterSize: 5,
        direction:  'vertical'
    })

    Split(['#chat', '#chat-input'], {
        sizes:      [90, 10],
        minSize:    [500, 100],
        gutterSize: 5,
        direction:  'vertical'
    })
}

function addChatExamples() {
    chat.add(new ChatMessage(Chat.Bot, "Hello I am a chatbot and I can help you with:"
        + "<ul>"
        + "<li>...</li>"
        + "<li>...</li>"
        + "</ul>"));
    chat.add(new ChatMessage(Chat.User, "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud "));
    chat.add(new ChatMessage(Chat.Bot, "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui ."));
    chat.add(new ChatMessage(Chat.User, "Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi ."));
    chat.add(new ChatMessage(Chat.Bot, "Here you have some options ..."));
    chat.add(new ChatQuickReply([
        {"text": "finish", "action": ""},
        {"text": "continue", "action": ""},
        {"text": "another option", "action": ""}
    ]));
    chat.add(new ChatCard({
        "title": "Some Fact",
        "text":  "velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat"
    }));
    chat.add(new ChatCard({
        "title": "More Cards",
        "image": "https://i.ytimg.com/vi/WhIqfqPJ_kY/maxresdefault.jpg",
        "text":  "velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat",
        "link":  {
            "text": "See image in full size",
            "url":  "https://i.ytimg.com/vi/WhIqfqPJ_kY/maxresdefault.jpg"
        }
    }));
    chat.add(new ChatAccordion([{
        "title": "Some Fact",
        "text":  "velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat"
    }, {
        "title": "AnotherFact",
        "text":  "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt "
    }]));
    chat.scroll();
}

function addContentExamples() {
    content.addTab({
        "title":   "secret",
        "content": "secret"
    }, "advanced");
}

/**
 * Constants
 */
const DEBUG = false;
let graph   = null;
let chat    = null;
let content = null;

/**
 * Runs on page load.
 */
function onLoad() {
    splitAreas();

    graph = new Graph("#graph", "#context-menu", sample_graph);
    Graph.showEdgeLabels(this.checked);

    chat = new Chat("#chat", "#user-input");
    addChatExamples()

    content = new Content("#content");
    addContentExamples();

    loadTheme();
}
