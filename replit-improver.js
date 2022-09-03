// ==UserScript==
// @name         ReplitImprover
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Прокачка Replit для проверяющих преподавателей
// @author       wignorbo
// @require      http://ajax.googleapis.com/ajax/libs/jquery/1.7.2/jquery.min.js
// @require      https://raw.githubusercontent.com/jeresig/jquery.hotkeys/master/jquery.hotkeys.js
// @require      https://gist.githubusercontent.com/BrockA/2625891/raw/9c97aa67ff9c5d56be34a55ad6c18a314e5eb548/waitForKeyElements.js
// @match        https://replit.com/*/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=replit.com
// ==/UserScript==


function getRunningAddons() {
    return [
        new FileNavigationShortcuts(),
        new HidePanelShortcuts(),
        new AddCopyButton(),
        new CoverPageShortcuts(),
    ];
}

class Addon {
    name = "";
    run() {};
}

class FileNavigationShortcuts extends Addon {
    name = "Горячие клавиши для перемещения между файлами";

    run() {
        // Файл выше: Alt+Up
        const FILE_UP_SHORTCUT = "alt+up";
        // Файл ниже: Alt+Down
        const FILE_DOWN_SHORTCUT = "alt+down";

        // Селектор файла в боковой панели
        const NODE_SELECTOR = ".node-info";
        // Селектор файла как интерактивного элемента
        const INTERACTIVE_NODE_SELECTOR = ".node.interactive";
        // Селектор активного файла
        const ACTIVE_NODE_CLASS = "active";
        // Селектор scroller'а кода
        const CODE_SCROLLER_SELECTOR = ".cm-scroller";
        // Селектор директории
        const DIR_SELECTOR = ".dir-node";
        // Селектор корневой директории
        const ROOT_DIR_SELECTOR = ".root-node";

        $(document).bind("keyup", FILE_UP_SHORTCUT, fileUp);
        $(document).bind("keyup", FILE_DOWN_SHORTCUT, fileDown);

        waitForKeyElements(NODE_SELECTOR, handleFiles);
        waitForKeyElements(CODE_SCROLLER_SELECTOR, activateCodeScroller);

        const files = []
        function handleFiles(node) {
            const fileNode = node.first();
            const fileName = fileNode.text();
            const folder = fileNode.parents(DIR_SELECTOR).not(ROOT_DIR_SELECTOR).first()
            const folderName = folder.find(NODE_SELECTOR).first().text()

            if (folderName === fileName) {
                // Это директория
                return;
            }

            files.push((folderName? (folderName + "/") : "") + fileName);
        }

        function fileUp() {
            const currentIndex = getCurrentFileIndex()
            const nextIndex = getNextFileIndex(currentIndex);
            setCurrentFile(nextIndex);
        }
        function fileDown() {
            const currentIndex = getCurrentFileIndex()
            const prevIndex = getPrevFileIndex(currentIndex);
            setCurrentFile(prevIndex);
        }
        function setCurrentFile(index) {
            if (files.length === 0) return;

            const file = files[index];
            const url = window.location.href;
            const base = url.includes("#")? url.split("#")[0] : url;
            window.location.href = base + "#" + file;
            updateActiveNode(index);
        }
        function getCurrentFileIndex() {
            const url = window.location.href;
            if (!url.includes("#"))
                return -1;
            const hash = decodeURI(url.split("#")[1]);
            return files.indexOf(hash);
        }
        function mod(n, m) { return ((n + m) + m) % m; }
        function getNextFileIndex(current) { return mod(current - 1, files.length); }
        function getPrevFileIndex(current) { return mod(current + 1, files.length); }
        function updateActiveNode(newIndex) {
            let fileName = files[newIndex];
            if (fileName.includes("/"))
                fileName = fileName.split("/")[1];
            $(INTERACTIVE_NODE_SELECTOR).removeClass(ACTIVE_NODE_CLASS);
            $(`${INTERACTIVE_NODE_SELECTOR}:contains(${fileName})`).first().addClass(ACTIVE_NODE_CLASS);
        }

        function activateCodeScroller() { $(CODE_SCROLLER_SELECTOR).first().focus(); }
    }
}

class HidePanelShortcuts extends Addon {
    name = "Горячие клавиши для скрытия/показа боковых панелей";

    run() {
        // Панель файлов
        const TOGGLE_PANEL_FILES_SHORTCUT = "h"
        // Панель меню
        const TOGGLE_PANEL_MENU_SHORTCUT = "m";

        // Селектор панели файлов
        const PANEL_FILES_SELECTOR = ".css-a1aqjc";
        // Селектор панели меню
        const PANEL_MENU_SELECTOR = ".css-1tsppws";

        $(document).bind("keyup", TOGGLE_PANEL_FILES_SHORTCUT, toggleFiles);
        $(document).bind("keyup", TOGGLE_PANEL_MENU_SHORTCUT, toggleSidePanel);

        function toggleFiles() { $(PANEL_FILES_SELECTOR).first().click(); }

        function toggleSidePanel() { $(PANEL_MENU_SELECTOR).first().click().blur(); }
    }
}

class AddCopyButton extends Addon {
    name = "Добавление кнопки Copy - скопировать весь код";

    run() {
        // Селектор кнопки Like
        const LIKE_BUTTON_SELECTOR = "header div.css-cg4is2 div.css-14n4q1b";
        // Селектор редактора кода
        const CODE_EDITOR_SELECTOR = ".cm-content.cm-lineWrapping";

        // HTML-код кнокпи Copy
        const BTN_COPY = `
            <button class="css-19oiz8w">
                <div class="css-6152sw">
                    <span class="css-o4584k">Copy</span>
                </div>
            </button>`;

        waitForKeyElements(LIKE_BUTTON_SELECTOR, addCopyButton);

        function addCopyButton(likeButton) {
            const copyButton = $("<div/>").html(BTN_COPY);
            copyButton.find("button").first().on("click", copyCode);
            likeButton.first().after(copyButton);
        }

        function copyCode() {
            const code = $(CODE_EDITOR_SELECTOR)[0];

            const range = document.createRange();
            range.selectNode(code);
            window.getSelection().removeAllRanges(code);
            window.getSelection().addRange(range);
            document.execCommand("copy");
            window.getSelection().removeAllRanges();
        }
    }
}

class CoverPageShortcuts extends Addon {
    name = "Горячие клавиши для перехода на страницу просмотра" // на случай если вам кинули join-ссылку с возможностью редактирования

    run() {
        // Переход на Cover Page: Alt+C
        const COVER_PAGE_SHORTCUT = "alt+c";

        $(document).bind("keyup", COVER_PAGE_SHORTCUT, goToCoverPage);

        function goToCoverPage() {
            const url = window.location.href;
            let hash = window.location.href.split("#")[1];
            const base = url.split(/[?#]/)[0];

            let coverPageUrl = `${base}?v=1`;
            if (hash) coverPageUrl = `${coverPageUrl}#${hash}`;

            window.location.href = coverPageUrl;
        }

        jQuery.hotkeys.options.filterContentEditable = false;
    }
}

function runAddons() {
    for (let addon of getRunningAddons()) {
        console.debug("[SkillboxImprover] Запуск > " + addon.name);
        addon.run();
    }
}

runAddons();