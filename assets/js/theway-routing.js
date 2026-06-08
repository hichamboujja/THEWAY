(function (window, document) {
    "use strict";

    const app = window.TheWay || (window.TheWay = {});
    const core = app.core;
    if (!core) return;

    function routeForNavText(text) {
        const key = core.normalize(text).replace(/&/g, "et");
        const context = core.context;

        if (key.includes("deconnexion")) {
            core.writeJSON(core.CURRENT_USER_KEY, null);
            return core.authPath("login.html");
        }

        if (context.isAdminArea) {
            if (key.includes("tableau de bord") || key === "dashboard") return core.adminPath("admin-dashboard.html");
            if (key.includes("utilisateur")) return core.adminPath("users.html");
            if (key.includes("entreprise")) return core.adminPath("entreprises.html");
            if (key === "offres" || key.includes("offre")) return core.adminPath("offres.html");
            if (key.includes("matching")) return core.adminPath("matching.html");
            if (key.includes("competence")) return core.adminPath("competences.html");
            if (key.includes("analyse")) return core.adminPath("analyse.html");
            if (key.includes("abonnement")) return core.adminPath("abonnements.html");
            if (key.includes("support")) return core.adminPath("support.html");
            if (key.includes("parametre")) return core.adminSettingsPath("profile.html");
            if (key.includes("role")) return core.adminPath("role_permession.html");
            return null;
        }

        if (key.includes("dashboard") || key.includes("tableau de bord")) return core.userPanelPath("dashboard.html");
        if (key.includes("cv") || key.includes("competence")) return core.userPanelPath("cv_competences.html");
        if (key.includes("matching")) return core.userPanelPath("matching.html");
        if (key.includes("skills")) return core.userPanelPath("skills.html");
        if (key.includes("opportunite")) return core.userPanelPath("opportunity.html");
        if (key.includes("progression")) return core.userPanelPath("progression.html");
        if (key.includes("parametre")) return core.userSettingsPath("profile.html");

        return null;
    }

    function routeForSettingsTab(tabName) {
        const tab = core.normalize(tabName);
        if (!tab) return null;

        if (core.context.isAdminArea) {
            const adminTabs = {
                profil: "profile.html",
                profile: "profile.html",
                compte: "generale.html",
                general: "generale.html",
                generale: "generale.html",
                security: "securite.html",
                securite: "securite.html",
                notifications: "notification.html",
                notification: "notification.html",
                confidentialite: "confidentialit\u00e9.html",
                integrations: "integration.html",
                integration: "integration.html",
                ia: "ia.html"
            };
            return adminTabs[tab] ? core.adminSettingsPath(adminTabs[tab]) : null;
        }

        const userTabs = {
            profil: "profile.html",
            profile: "profile.html",
            compte: "compte.html",
            notifications: "notification.html",
            notification: "notification.html",
            confidentialite: "confidentialit\u00e9.html",
            preferences: "preference.html",
            preference: "preference.html",
            securite: "compte.html"
        };
        return userTabs[tab] ? core.userSettingsPath(userTabs[tab]) : null;
    }

    function installRouting() {
        document.addEventListener("click", function (event) {
            if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

            const authLink = event.target.closest("#signupLink, #loginLink, a.login-btn, a[href='authentification.html']");
            if (authLink) {
                event.preventDefault();
                event.stopImmediatePropagation();
                core.goTo(core.authPath(authLink.id === "signupLink" ? "register.html" : "login.html"));
                return;
            }

            const settingsTab = event.target.closest(".tab-item[data-tab]");
            if (settingsTab && (core.context.isUserSettings || core.context.isAdminSettings || settingsTab.closest(".tabs-bar"))) {
                const target = routeForSettingsTab(settingsTab.dataset.tab);
                if (target) {
                    event.preventDefault();
                    event.stopImmediatePropagation();
                    core.goTo(target);
                }
                return;
            }

            const navItem = event.target.closest("a.nav-item");
            if (navItem) {
                const href = navItem.getAttribute("href");
                const route = href && href !== "#" ? href : routeForNavText(navItem.textContent);
                if (route) {
                    event.preventDefault();
                    event.stopImmediatePropagation();
                    core.goTo(route);
                }
                return;
            }

            const publicOpportunity = event.target.closest("a[href='opportunity.html']");
            if (publicOpportunity && core.context.isPublic) {
                event.preventDefault();
                event.stopImmediatePropagation();
                core.goTo("../pannel/opportunity.html");
            }
        }, true);
    }

    function markCurrentNavigation() {
        const current = core.normalize(location.pathname.split("/").pop() || "");
        document.querySelectorAll("a.nav-item").forEach(function (item) {
            const route = routeForNavText(item.textContent);
            if (!route) return;
            const target = core.normalize(new URL(route, location.href).pathname.split("/").pop() || "");
            if (target && target === current) {
                document.querySelectorAll("a.nav-item.active").forEach(function (activeItem) {
                    activeItem.classList.remove("active");
                });
                item.classList.add("active");
            }
        });
    }

    app.routing = {
        init: function () {
            installRouting();
            markCurrentNavigation();
        },
        routeForNavText: routeForNavText,
        routeForSettingsTab: routeForSettingsTab
    };
})(window, document);
