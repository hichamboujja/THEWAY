(function (window, document) {
    "use strict";

    const currentScript = document.currentScript;
    const basePath = currentScript && currentScript.src
        ? currentScript.src.replace(/[^/]+$/, "")
        : "";
    const moduleGroups = [
        ["theway-core.js"],
        [
            "theway-routing.js",
            "theway-state.js",
            "theway-ui.js",
            "theway-api.js",
            "theway-action-feedback.js",
            "theway-action-files.js",
        ],
        ["theway-panel-data.js"],
        [
            "theway-action-registry.js",
            "theway-action-ui.js",
            "theway-action-navigation.js"
        ],
        ["theway-auth.js", "theway-action-handlers.js"],
        ["theway-actions.js"]
    ];

    function loadScript(fileName) {
        return new Promise(function (resolve, reject) {
            const script = document.createElement("script");
            script.src = basePath + fileName;
            script.defer = true;
            script.onload = resolve;
            script.onerror = function () {
                reject(new Error("Unable to load " + fileName));
            };
            document.head.appendChild(script);
        });
    }

    function start() {
        const app = window.TheWay || {};
        if (!app.core) return;

        app.core.ready(function () {
            if (app.routing) app.routing.init();
            if (app.auth) app.auth.init();
            if (app.state) app.state.init();
            if (app.ui) app.ui.init();
            if (app.actions) app.actions.init();
        });
    }

    function assertModulesReady() {
        const app = window.TheWay || {};
        const required = ["core", "routing", "state", "ui", "api", "panelData", "auth", "actionFeedback", "actionUI", "actionFiles", "actionNavigation", "actionRegistry", "actionHandlers", "actions"];
        const missing = required.filter(function (name) { return !app[name]; });
        if (missing.length) {
            throw new Error("Missing THEWAY module(s): " + missing.join(", "));
        }
    }

    moduleGroups
        .reduce(function (chain, group) {
            return chain.then(function () {
                return Promise.all(group.map(loadScript));
            });
        }, Promise.resolve())
        .then(function () {
            assertModulesReady();
            start();
        })
        .catch(function (error) {
            console.error("[THEWAY] Dynamic layer failed:", error);
        });
})(window, document);
