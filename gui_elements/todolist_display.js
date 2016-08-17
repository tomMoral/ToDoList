

const Meta = imports.gi.Meta;
const Main = imports.ui.main;
const St = imports.gi.St;
const Gtk = imports.gi.Gtk;
const GLib = imports.gi.GLib;
const Lang = imports.lang;
const Gio = imports.gi.Gio;
const Shell = imports.gi.Shell;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Clutter = imports.gi.Clutter;
const Gettext = imports.gettext;


const Extension = imports.misc.extensionUtils.getCurrentExtension();
const section_item = Extension.imports.gui_elements.section_item;
const ExtensionSettings = Extension.imports.utils.getSettings();
const debug = Extension.imports.utils.debug;


const MAX_LENGTH = 100;
const KEY_RETURN = 65293;
const KEY_ENTER  = 65421;
const BASE_SECS = "Section 1\nSection 2\n";

// TodoList object
function TodoList(metadata)
{
    this.meta = metadata;
    this.n_tasks = 0;
    this._init();
}

TodoList.prototype = {
    __proto__: PanelMenu.Button.prototype,

    _init : function(){
        // Tasks file
        this.dirPath = GLib.get_home_dir() + "/.config/ToDoList/";
        if(! GLib.file_test(this.dirPath, GLib.FileTest.EXISTS)){
            GLib.mkdir_with_parents(this.dirPath, 511);
        }
        this.sectionsFile =  this.dirPath + "section.tasks";

        // Locale
        let locales = this.meta.path + "/locale";
        Gettext.bindtextdomain('todolist', locales);

        // Button ui
        PanelMenu.Button.prototype._init.call(this, St.Align.START);
        this.mainBox = null;
        this.buttonText = new St.Label({text:_("(...)"), y_align: Clutter.ActorAlign.CENTER});
        this.buttonText.set_style("text-align:center;");
        this.actor.add_actor(this.buttonText);

        this._buildUI();
        this._fill_ui();

        // Key binding
        let mode = Shell.ActionMode ? Shell.ActionMode.ALL : Shell.KeyBindingMode.ALL;
        Main.wm.addKeybinding('open-todolist',
                              ExtensionSettings,
                              Meta.KeyBindingFlags.NONE,
                              mode,
                              Lang.bind(this, this.signalKeyOpen));
    },
    _buildUI: function(){
        // Destroy previous box         
        if (this.mainBox != null)
            this.mainBox.destroy();


        // Create main box
        this.mainBox = new St.BoxLayout();
        this.mainBox.set_vertical(true);

        // Create todos box
        let todosSec = new PopupMenu.PopupMenuSection('todosBox');
        todosSec.one = false
        // Call back to ensure only one section is open
        todosSec._setOpenedSubMenu = function(subMenu){
            if(todosSec.one)
                return;
            todosSec.one = true;

            for each (var item in todosSec._getMenuItems()){
                item.menu.close();
            }
            if(subMenu != null)
                subMenu.open();
            todosSec.one = false;
        }
        this.todosSec = todosSec;

        // Create todos scrollview
        var scrollView = new St.ScrollView({style_class: 'vfade',
            hscrollbar_policy: Gtk.PolicyType.NEVER,
            vscrollbar_policy: Gtk.PolicyType.AUTOMATIC});
        scrollView.add_actor(this.todosSec.actor);
        this.mainBox.add_actor(scrollView);

        // Separator
        var separator = new PopupMenu.PopupSeparatorMenuItem();
        this.mainBox.add_actor(separator.actor);

        // Text entry
        this.newTask = new St.Entry({
            name: "newSectionEntry",
            hint_text: _("New Section..."),
            track_hover: true,
            can_focus: true
        });
        let entryNewTask = this.newTask.clutter_text;
        entryNewTask.set_max_length(MAX_LENGTH);
        // Call back to add section when ENTER is press
        entryNewTask.connect('key-press-event', Lang.bind(this,function(o,e)
        {
            let symbol = e.get_key_symbol();
            if (symbol == KEY_RETURN || symbol == KEY_ENTER)
            {
                this._addSection(o.get_text());
                entryNewTask.set_text('');
            }
        }));

        // Bottom section
        var bottomSection = new PopupMenu.PopupMenuSection();
        bottomSection.actor.add_actor(this.newTask);
        bottomSection.actor.add_style_class_name("newTaskSection");
        this.mainBox.add_actor(bottomSection.actor);
        this.menu.box.add(this.mainBox);
    },

    // Fill UI with the section items
    _fill_ui : function(){

        debug("Fill UI");
        
        // Check if tasks file exists
        this._clear();
        this.n_tasks = 0;

        let content = this._read(true);
        let lines = content.toString().split('\n');
        this.sections = [];
        for(let i=0; i<lines.length; i++)
        {
            if (lines[i] != '' && lines[i] != '\n'){
                let text = lines[i];
                let section = new section_item.SectionItem(this.menu, text, this.dirPath);
                this.n_tasks += section.n_tasks;
                this.todosSec.addMenuItem(section);
                section.connect('supr_signal', Lang.bind(this, function(item, name){
                    debug('Catch supr signal');
                    this._removeSection(name);
                }));
                section.connect('task_count_changed', Lang.bind(this, function(item, diff){
                    debug('Task count changed: '+ diff);
                    this.n_tasks -= diff;
                    this.buttonText.set_text("ToDo ("+this.n_tasks+")");
                }));
                section.connect('name_changed', Lang.bind(this, function(o, oldSec, newSec){
                    debug(oldSec + ' || ' + newSec);
                    this._removeSection(oldSec);
                    this._addSection(newSec);
                }));
            }
        }

        // Update status button
        this.buttonText.set_text("ToDo ("+this.n_tasks+")");

        // Restore hint text
        this.newTask.hint_text = _("New task...");

    },
    _clear : function(){
        for each (var section in this.todosSec.menu){
            section._clear();
            section._terminate();
        }
        this.todosSec.removeAll();
    },
    _addSection : function(text){
        // Don't add empty task
        if (text == '' || text == '\n')
            return;

        // Append to content
        let content = this._read(false);
        content = content + text + "\n";
        this._write(content);
    },

    // Remove section 'text' from the section file
    _removeSection : function(text){

        // Create new text to write
        let content = this._read(false);
        let tasks = content.toString().split('\n');
        let newText = "";
        for (let i=0; i<tasks.length; i++){
            // Add task to new text if not empty and not removed task
            if (tasks[i] != text && tasks[i] != '' && tasks[i] != '\n'){
                newText += tasks[i];
                newText += "\n";
            }
        }
        this._write(newText);

        // Remove the file associated to this section
        let secFile = this.dirPath+text+'.tasks';
        let cmd_line = "rm '"+secFile+"'";
        var r = GLib.spawn_command_line_sync(cmd_line, null);
        debug('Result for rm: ' + r);

    },
    _read:  function(create){
        let file = this.sectionsFile
        // Check if file exists
        if (!GLib.file_test(file, GLib.FileTest.EXISTS)){
            //Create if needed
            if(create && !GLib.file_test(file, GLib.FileTest.EXISTS))
                GLib.file_set_contents(file, BASE_SECS);
            else
                global.logError("Todo list : Error with file : " + file);
            return "";
        }
        let content = Shell.get_file_contents_utf8_sync(file);
        return content;
    },
    _write : function(content){
        // Write new text to file
        let file = this.sectionsFile;
        let f = Gio.file_new_for_path(file);
        let out = f.replace(null, false, Gio.FileCreateFlags.NONE, null);
        Shell.write_string_to_stream (out, content);
        out.close(null);
    },
    _enable : function() {
        // Conect file 'changed' signal to _refresh
        let fileM = Gio.file_new_for_path(this.sectionsFile);
        this.monitor = fileM.monitor(Gio.FileMonitorFlags.NONE, null);
        this.monitor.connect('changed', Lang.bind(this, this._fill_ui));

    },
    _disable : function() {
        // Stop monitoring file
        this.monitor.cancel();
        this._clear();
        Main.wm.removeKeybinding('open-todolist');
        debug('clean up for todolist done');
    },
    // Called when 'open-todolist' is emitted (binded with Lang.bind)
    signalKeyOpen: function(){
        if (this.menu.isOpen)
            this.menu.close();
        else{
            this.menu.open();
            this.newTask.grab_key_focus();
        }
    },
    _onOpenStateChanged: function(state, s){
        if(s)
            for each (var item in this.todosSec._getMenuItems()){
                    item.menu.close();
                }
    }


}