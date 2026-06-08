(function (window, document) {
    "use strict";

    const app = window.TheWay || (window.TheWay = {});
    const core = app.core;
    if (!core) return;

    function controlKey(control) {
        if (control.id) return control.id;
        if (control.name) return control.name;
        const controls = Array.from(document.querySelectorAll("input, textarea, select"));
        return "control-" + controls.indexOf(control);
    }

    function shouldPersistControl(control) {
        if (!control || control.disabled) return false;
        const type = core.normalize(control.type);
        if (["password", "file", "hidden", "submit", "button", "reset"].includes(type)) return false;
        if (type === "search") return false;
        if (control.closest("form#loginForm") && control.id !== "email") return false;
        if (control.closest(".search-box, .filter-search, .search-input-wrapper, .search-form")) return false;
        if (core.normalize(control.placeholder).includes("rechercher")) return false;
        return true;
    }

    function getControlValue(control) {
        if (control.type === "checkbox" || control.type === "radio") return control.checked;
        return control.value;
    }

    function setControlValue(control, value) {
        if (control.type === "checkbox" || control.type === "radio") {
            control.checked = Boolean(value);
            return;
        }
        control.value = value;
    }

    function pageStorageKey(key) {
        return core.APP_PREFIX + ".page." + location.pathname + "." + key;
    }

    function initPersistentControls() {
        const controls = Array.from(document.querySelectorAll("input, textarea, select")).filter(shouldPersistControl);

        controls.forEach(function (control) {
            const key = pageStorageKey(controlKey(control));
            const saved = core.readJSON(key, undefined);
            if (saved !== undefined && saved !== null) {
                setControlValue(control, saved);
                control.dispatchEvent(new Event("input", { bubbles: true }));
                control.dispatchEvent(new Event("change", { bubbles: true }));
            }

            const save = function () {
                core.writeJSON(key, getControlValue(control));
            };
            control.addEventListener("input", save);
            control.addEventListener("change", save);
        });

        document.querySelectorAll(".day-chip").forEach(function (chip) {
            const key = pageStorageKey("day." + (chip.dataset.day || chip.textContent.trim()));
            const saved = core.readJSON(key, null);
            if (saved !== null) {
                chip.classList.toggle("active", saved === "active");
                chip.classList.toggle("inactive", saved !== "active");
            }
            chip.addEventListener("click", function () {
                setTimeout(function () {
                    core.writeJSON(key, chip.classList.contains("active") ? "active" : "inactive");
                }, 0);
            });
        });
    }

    function syncProfileFields() {
        const user = core.getCurrentUser();
        const fullNameInput = document.getElementById("fullName");
        const emailInput = document.getElementById("email");
        const phoneInput = document.getElementById("phone");
        const locationInput = document.getElementById("location");
        const jobTitleInput = document.getElementById("jobTitle");
        const firstNameInput = document.getElementById("firstName");
        const lastNameInput = document.getElementById("lastName");

        if (fullNameInput && !core.readJSON(pageStorageKey("fullName"), null)) fullNameInput.value = user.fullName || "";
        if (emailInput && !emailInput.closest("#loginForm, #signupForm")) emailInput.value = user.email || emailInput.value;
        if (phoneInput) phoneInput.value = user.phone || phoneInput.value;
        if (locationInput) locationInput.value = user.location || locationInput.value;
        if (jobTitleInput) jobTitleInput.value = user.jobTitle || jobTitleInput.value;
        if (firstNameInput && user.fullName) firstNameInput.value = user.fullName.split(" ")[0] || firstNameInput.value;
        if (lastNameInput && user.fullName) lastNameInput.value = user.fullName.split(" ").slice(1).join(" ") || lastNameInput.value;

        document.querySelectorAll(".user-profile .name, .user-menu .name").forEach(function (node) {
            node.textContent = user.fullName || node.textContent;
        });
        document.querySelectorAll(".user-profile .role, .user-menu .role").forEach(function (node) {
            node.textContent = user.role || node.textContent;
        });
        document.querySelectorAll(".user-avatar").forEach(function (avatar) {
            if (avatar.querySelector("img")) return;
            const initials = (user.fullName || "TW")
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map(function (part) { return part.charAt(0).toUpperCase(); })
                .join("");
            if (initials) avatar.textContent = initials;
        });
    }

    function updateUserFromProfile() {
        const user = Object.assign({}, core.getCurrentUser());
        const fullName = document.getElementById("fullName");
        const email = document.getElementById("email");
        const phone = document.getElementById("phone");
        const locationInput = document.getElementById("location");
        const jobTitle = document.getElementById("jobTitle");
        const firstName = document.getElementById("firstName");
        const lastName = document.getElementById("lastName");

        if (fullName && fullName.value.trim()) user.fullName = fullName.value.trim();
        if (firstName && firstName.value.trim()) {
            user.fullName = [firstName.value.trim(), lastName ? lastName.value.trim() : ""].filter(Boolean).join(" ");
        }
        if (email && email.value.trim() && !email.closest("#loginForm, #signupForm")) user.email = email.value.trim();
        if (phone && phone.value.trim()) user.phone = phone.value.trim();
        if (locationInput && locationInput.value.trim()) user.location = locationInput.value.trim();
        if (jobTitle && jobTitle.value.trim()) user.jobTitle = jobTitle.value.trim();

        core.rememberSessionUser(user);
        syncProfileFields();
    }

    function collectPageSettings() {
        const settings = {};
        document.querySelectorAll("input, textarea, select").forEach(function (control) {
            if (!shouldPersistControl(control)) return;
            settings[controlKey(control)] = getControlValue(control);
        });
        return settings;
    }

    function persistPageSettings() {
        document.querySelectorAll("input, textarea, select").forEach(function (control) {
            if (!shouldPersistControl(control)) return;
            core.writeJSON(pageStorageKey(controlKey(control)), getControlValue(control));
        });
    }

    function initAuthForms() {
        const signup = document.getElementById("signupForm");
        if (signup) {
            signup.addEventListener("submit", function () {
                setTimeout(function () {
                    if (signup.querySelector(".error.show, .error-message.show")) return;
                    const fullName = document.getElementById("fullname");
                    const email = document.getElementById("email");
                    if (!fullName || !email || !email.value.trim()) return;

                    core.rememberSessionUser({
                        fullName: fullName.value.trim(),
                        email: email.value.trim(),
                        phone: "",
                        location: "",
                        jobTitle: "",
                        role: "Candidat"
                    });
                }, 30);
            });
        }

        const login = document.getElementById("loginForm");
        if (login) {
            login.addEventListener("submit", function () {
                setTimeout(function () {
                    if (login.querySelector(".error.show, .error-message.show")) return;
                    const email = document.getElementById("email");
                    if (!email || !email.value.trim()) return;

                    const current = core.readJSON(core.CURRENT_USER_KEY, null);
                    const sameSessionUser = current && core.normalize(current.email) === core.normalize(email.value);
                    const found = Object.assign(
                        {},
                        core.defaultUser,
                        sameSessionUser ? current : {},
                        { email: email.value.trim(), role: "Candidat" }
                    );

                    core.rememberSessionUser(found);
                    setTimeout(function () {
                        core.goTo("../pannel/dashboard.html");
                    }, 2100);
                }, 30);
            });
        }
    }

    function initSaveActions() {
        document.addEventListener("click", function (event) {
            const button = event.target.closest(".btn-save, .save-btn, #saveBtn");
            if (!button) return;

            updateUserFromProfile();
            persistPageSettings();

            const payload = {
                label: (button.textContent || "save").replace(/\s+/g, " ").trim(),
                page: location.pathname,
                settings: collectPageSettings(),
                user: core.getCurrentUser()
            };

            if (app.api && typeof app.api.request === "function") {
                const task = function () {
                    return app.api.request("entity.update", payload);
                };

                if (app.actionFeedback && typeof app.actionFeedback.runAsyncAction === "function") {
                    app.actionFeedback.runAsyncAction(button, {
                        loading: "Sauvegarde...",
                        success: "Modifications synchronisees.",
                        error: "Sauvegarde locale OK, synchronisation impossible."
                    }, task);
                    return;
                }

                task()
                    .then(function () { core.showMessage("Modifications synchronisees."); })
                    .catch(function (error) { core.showMessage("Sauvegarde locale OK, synchronisation impossible. " + (error.message || "")); });
                return;
            }

            core.showMessage("Modifications enregistrees.");
        });
    }

    app.state = {
        init: function () {
            initPersistentControls();
            syncProfileFields();
            initAuthForms();
            initSaveActions();
        },
        syncProfileFields: syncProfileFields,
        updateUserFromProfile: updateUserFromProfile,
        shouldPersistControl: shouldPersistControl,
        controlKey: controlKey,
        getControlValue: getControlValue,
        collectPageSettings: collectPageSettings,
        persistPageSettings: persistPageSettings
    };
})(window, document);
