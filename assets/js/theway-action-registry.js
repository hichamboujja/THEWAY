(function (window) {
    "use strict";

    const app = window.TheWay || (window.TheWay = {});
    const idActions = {
        forgotLink: { action: "forgot-password" },
        newAnalysisBtn: { action: "process" }
    };
    const classActions = {
        "legal-link": { action: "legal" },
        "social-btn": { action: "social-login" },
        "page-btn": { action: "pagination" },
        "filter-btn": { action: "filter" },
        "btn-filters": { action: "filter" },
        "copy-btn": { action: "copy" },
        "premium-btn": { action: "plans" },
        "btn-plan": { action: "plans" },
        "table-action": { action: "context-menu" },
        "session-more": { action: "context-menu" },
        "exp-more-btn": { action: "context-menu" },
        "more-btn": { action: "context-menu" },
        "btn-more": { action: "context-menu" },
        "btn-upload": { action: "upload" },
        "photo-upload-btn": { action: "upload" },
        "pp-btn": { action: "upload" },
        "edit-avatar-btn": { action: "upload" },
        "btn-export": { action: "download", download: "export" },
        "btn-invoice": { action: "download", download: "invoice" },
        "btn-delete": { action: "destructive" },
        "btn-deactivate": { action: "destructive" },
        "btn-suspend": { action: "destructive" },
        "btn-disconnect": { action: "disconnect-integration" },
        "btn-add": { action: "create" },
        "btn-create": { action: "create" },
        "btn-invite": { action: "create" },
        "btn-new": { action: "create" },
        "add-skill": { action: "create" },
        "btn-modifier": { action: "edit" },
        "exp-edit-btn": { action: "edit" },
        "btn-connect": { action: "connect" },
        "btn-action": { action: "integration-action" },
        "btn-launch": { action: "process" },
        "btn-validate": { action: "process" },
        "refresh-btn": { action: "process" },
        "continue-btn": { action: "process" },
        "cta-btn": { action: "process" },
        "btn-view": { action: "view" },
        "btn-profile": { action: "view" },
        "btn-analyses": { action: "view" },
        "btn-review": { action: "view" },
        "btn-pending": { action: "view" },
        "btn-details": { action: "view" },
        "view-all": { action: "view" },
        "view-all-link": { action: "view" },
        "view-all-btn": { action: "view" },
        "view-sessions-link": { action: "view" },
        "more-info-link": { action: "view" },
        "help-btn": { action: "view" },
        "see-more-btn": { action: "view" },
        "see-all-tips": { action: "view" },
        "job-arrow": { action: "view" },
        "view-plan-btn": { action: "view", target: "progression" },
        "opp-bookmark": { action: "bookmark" }
    };

    function configFor(element) {
        if (element.id && idActions[element.id]) return idActions[element.id];
        for (const className of element.classList) {
            if (classActions[className]) return classActions[className];
        }
        return null;
    }

    app.actionRegistry = {
        ignoredSelector: ".nav-item, .tab-item, .panel-tab, .chart-tab, .menu-toggle, .mobile-menu-btn, .panel-close, .detail-close, .password-toggle, .day-chip, .toggle, .notification-btn, .header-btn, #signupLink, #loginLink",
        managedSelector: ".nav-item, .tab-item, .panel-tab, .chart-tab, .menu-toggle, .mobile-menu-btn, .panel-close, .detail-close, .password-toggle, .day-chip, .toggle, .notification-btn, .header-btn, #signupLink, #loginLink, .btn-save, .save-btn",
        configFor: configFor
    };
})(window);
