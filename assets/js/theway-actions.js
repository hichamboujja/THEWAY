(function (window, document) {
    "use strict";

    const app = window.TheWay || (window.TheWay = {});
    const core = app.core;
    const ui = app.actionUI;
    const feedback = app.actionFeedback;
    const actionHandlers = app.actionHandlers;
    const actionRegistry = app.actionRegistry;
    const missingDependencies = [
        ["core", core],
        ["actionUI", ui],
        ["actionFeedback", feedback],
        ["actionHandlers", actionHandlers],
        ["actionRegistry", actionRegistry]
    ].filter(function (item) { return !item[1]; }).map(function (item) { return item[0]; });
    if (missingDependencies.length) {
        throw new Error("[THEWAY] Missing action dependencies: " + missingDependencies.join(", "));
    }
    function labelOf(element) {
        const aria = element.getAttribute("aria-label");
        const title = element.getAttribute("title");
        const text = element.textContent || "";
        return (aria || title || text || "").replace(/\s+/g, " ").trim();
    }

    function setActionAttribute(element, config) {
        if (!element.dataset.twAction) element.dataset.twAction = config.action;
        if (config.target && !element.dataset.twTarget) element.dataset.twTarget = config.target;
        if (config.download && !element.dataset.twDownload) element.dataset.twDownload = config.download;
    }

    function markManagedElement(element) {
        if (element.matches(actionRegistry.managedSelector)) {
            element.dataset.twManaged = "external";
        }
    }

    function hydrateRegisteredAction(element) {
        const config = actionRegistry.configFor(element);
        if (!config) return false;
        setActionAttribute(element, config);
        return true;
    }

    function hydrateFallbackLink(element) {
        if (!element.matches("a[href='#']")) return;
        if (element.closest("[data-tw-managed='external']")) return;
        if (element.id === "signupLink" || element.id === "loginLink") return;
        if (element.classList.contains("nav-item") || element.closest(".nav-item")) return;
        setActionAttribute(element, { action: "view" });
    }

    function hydrateActionAttributes() {
        document.querySelectorAll("button, a[href='#']").forEach(function (element) {
            markManagedElement(element);
            if (hydrateRegisteredAction(element)) return;
            hydrateFallbackLink(element);
        });
    }

    function resolveConfiguredAction(element) {
        const explicitAction = element.dataset.twAction || element.dataset.action;
        if (explicitAction) return explicitAction;

        const config = actionRegistry.configFor(element);
        if (!config) return "";

        setActionAttribute(element, config);
        return config.action;
    }

    function resolveAction(element) {
        const configuredAction = resolveConfiguredAction(element);
        if (configuredAction) return configuredAction;
        return "";
    }

    function shouldSkipAction(element) {
        const configuredAction = Boolean(element.dataset.twAction || element.dataset.action || actionRegistry.configFor(element));
        const managedByAnotherController = Boolean(element.closest("[data-tw-managed='external']"));
        const nativeSubmit = !configuredAction && element.matches("button[type='submit'], input[type='submit']");
        const implicitFormSubmit = !configuredAction && Boolean(element.closest("form") && !element.matches("button[type='button'], a"));
        return managedByAnotherController || nativeSubmit || implicitFormSubmit;
    }

    function actionContext(element) {
        return {
            element: element,
            label: labelOf(element),
            action: resolveAction(element)
        };
    }

    function handleAction(event) {
        const element = event.target.closest("button, a[href='#']");
        if (!element) return;
        if (shouldSkipAction(element)) return;

        const context = actionContext(element);
        const handler = actionHandlers.get(context.action);
        if (!handler) return;

        event.preventDefault();
        handler(context);
    }

    function init() {
        ui.ensureStylesheet();
        hydrateActionAttributes();
        window.addEventListener("beforeunload", feedback.clearAllFeedbackTimers, { once: true });
        document.addEventListener("click", handleAction);
        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape") {
                if (ui.closeModal) ui.closeModal();
                if (ui.closePopover) ui.closePopover();
            }
        });
    }

    app.actions = {
        init: init
    };
})(window, document);
