// Authors:
// * Thomas Moreau http://tommoral.github.io/
// With code from: https://github.com/bsaleil/todolist-gnome-shell-extension
//
// Licence: GPLv2+
const Main = imports.ui.main;
const Extension = imports.misc.extensionUtils.getCurrentExtension();
const todo_list = Extension.imports.gui_elements.todolist_display;
const initTranslations = Extension.imports.utils.initTranslations;
const debug = Extension.imports.utils.debug;

let todolist;   // Todolist instance
let meta;

// Init function
function init(metadata)
{
    meta = metadata;
    initTranslations("todolist");
}

function enable()
{
    todolist = new todo_list.TodoList(meta);
    todolist._enable();
    Main.panel.addToStatusArea(meta.uuid, todolist.menu_button);
}

function disable()
{
    todolist._disable();
    todolist.menu_button.destroy();
    todolist = null;
}

//----------------------------------------------------------------------
