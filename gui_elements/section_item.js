
const PopupMenu = imports.ui.popupMenu;
const ModalDialog = imports.ui.modalDialog;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const Shell = imports.gi.Shell;
const Lang = imports.lang;
const St = imports.gi.St;
const Gettext = imports.gettext.domain('gnome-shell');
const _ = Gettext.gettext;


const Extension = imports.misc.extensionUtils.getCurrentExtension();
const TaskItem = Extension.imports.gui_elements.task_item;
const EntryItem = Extension.imports.gui_elements.entry_item.EntryItem;
const RenameDialog = Extension.imports.gui_elements.rename_dialog.RenameDialog;
const debug = Extension.imports.utils.debug;

const BASE_TASKS = "";
const KEY_DELETE = 65535;

const GTK_CLOSE_ICON = Gio.icon_new_for_string(Extension.path + "/icons/gtk-close.png");

// Read more: http://blog.fpmurphy.com/2011/04/replace-gnome-shell-activities-text-string-with-icon.html#ixzz3ndrA3Jrl



// TodoList object
function SectionItem(parent_menu, name, dir)
{
    this._init(parent_menu, name, dir);
}

SectionItem.prototype = {
    __proto__ : PopupMenu.PopupSubMenuMenuItem.prototype,
    _init: function(parent_menu, fileName, directory)
    {
        this.parent_menu = parent_menu;

        // Fill section from the associated file
        this.sectionFile = directory+fileName+'.tasks';
        this.n_tasks = 0;
        this.metaConn = [];
        this.fileName = fileName;
        this.directory = directory;
        PopupMenu.PopupSubMenuMenuItem.prototype._init.call(this, fileName);
        let logo = new St.Icon({icon_size: 12, gicon: GTK_CLOSE_ICON,
                                style_class: 'icon_sec'});
        this.supr = new St.Button({ style_class: 'sec_supr', label:''});
        this.supr.add_actor(logo);
        this.actor.add_actor(this.supr);
        this.new_task = Lang.bind(this, function(item, text){
                    this._add_task(text);
                    this._draw_section('New task');
                });
        this._draw_section('init', false);
        this.metaConn.push(this.actor.connect('button-release-event', 
                                              Lang.bind(this, this._clicked)));
        this.metaConn.push(this.actor.connect('key-release-event',  
                           Lang.bind(this, this._key_pressed)));
        this.metaConn.push(this.supr.connect('clicked',
                           Lang.bind(this, this._supr_call)));
    },
    _key_pressed : function(actor, ev)
    {
        let symbol = ev.get_key_symbol();
        if (symbol == KEY_DELETE && this.n_tasks == 0)
        {
            debug('Delete key press in section');
            this._supr_call();
        }
    },
    _clicked : function(actor, ev)
    {
        var double_click = ev.get_click_count() == 2;

        // Add rename on double click
        if (double_click)
        {
            debug('Double click in section');
            this.parent_menu.close();
            let mod = new RenameDialog(this.fileName);
            mod.set_callback(Lang.bind(this, this._rename));
            mod.open();
        }
    },
    _draw_section: function(caller, redraw=true)
    {
        debug('Draw section for '+ caller);
        this._clear();

        // Initiate the task count
        let diff = this.n_tasks;
        this.n_tasks = 0;


        // Get section content and create file if needed
        let content = this._read(true);
        let taskText = content.toString().split('\n');
        this.supr.hide();
        for(let i=0; i < taskText.length; i++)
        {
            if (taskText[i] != '' && taskText[i] != '\n')
            {
                // Create a task item and set its callback
                let taskItem = new TaskItem.TaskItem(this.parent_menu, taskText[i]);
                let textClicked = taskText[i];
                taskItem.connect(
                    'name_changed', 
                    Lang.bind(this, function(o, oldtext, new_text){
                        this._remove_task(oldtext);
                        this._add_task(new_text);
                        this._draw_section();
                    }));
                taskItem.connect(
                    'supr_signal', 
                    Lang.bind(this, function(o, name){
                        debug('callback supr_signal in section')
                        this._remove_task(name);
                        this._draw_section('Remove task');
                    }));
                this.menu.addMenuItem(taskItem);
                this.n_tasks++;
            }
        }
        this.label.set_text(this.fileName + " (" + this.n_tasks + ")");
        diff = diff - this.n_tasks;
        if(redraw && diff != 0)
            this.emit('task_count_changed', diff);
        if(this.n_tasks == 0)
            this.supr.show();

        let entry_task = new EntryItem();
        entry_task.connect('new_task', this.new_task);
        this.menu.addMenuItem(entry_task);
        return this;
    },
    _add_task : function(text)
    {
        // Don't add empty task
        if (text == '' || text == '\n')
            return;
        debug("Add task to section " + text);
        // Append to content
        let content = this._read(false);
        content = content + text + "\n";
        this._write(content);
    },
    _remove_task : function (text)
    {
        // Create new text to write
        let content = this._read(false);
        let tasks = content.toString().split('\n');
        let newText = "";
        for (let i=0; i<tasks.length; i++)
        {
            debug(tasks[i] + ' - ' + text + '-' + tasks[i] == text)
            // Add task to new text if not empty and not removed task
            if (tasks[i] != text && tasks[i] != '' && tasks[i] != '\n')
            {
                newText += tasks[i] + "\n";
            }
        }
        
        // Write new text to file
        this._write(newText);
    },
    _rename : function(text)
    {
        if(text == this.fileName || text.length == 0)
            return;

        // Copy the task list to a new location
        let newSectionFile = this.directory+text+'.tasks';
        let cmd_line = "cp '"+this.sectionFile+"' '"+newSectionFile+"'";
        var r = GLib.spawn_command_line_sync(cmd_line, null);
        debug('Result for copy: '+cmd_line + " -> " + r);

        // Emit signal so todolist clean up
        this.emit('name_changed', this.fileName, text);

        // Change the class variables
        this.fileName = text;
        this.sectionFile = newSectionFile;

    },
    _clear : function()
    {
        items = this.menu._getMenuItems();
        for (let i=0; i<items.length; i++)
        {
            item = items[i];
            item._destroy();
            item.disconnectAll();
        }
        this.menu.removeAll();

    },
    _destroy: function(){
        for each (var conn in this.metaConn){
            this.disconnect(conn);
            this.metaConn.pop();
        }
        debug("Section clean-up done")
    },
    _read:  function(create)
    {
        let file = this.sectionFile;
        // Check if file exists
        if (!GLib.file_test(file, GLib.FileTest.EXISTS))
        {
            //Create if needed
            if(create && !GLib.file_test(file, GLib.FileTest.EXISTS))
                GLib.file_set_contents(file, BASE_TASKS);
            else
                global.logError("Todo list : Error with file : " + file);
                return "";
        }
        let content = Shell.get_file_contents_utf8_sync(file);
        return content;
    },
    _write : function(content)
    {
        // Write new text to file
        let file = this.sectionFile;
        let f = Gio.file_new_for_path(file);
        let out = f.replace(null, false, Gio.FileCreateFlags.NONE, null);
        Shell.write_string_to_stream (out, content);
        out.close(null);
    },
    _supr_call : function()
    {
        debug('Emit supr signal');
        this.emit('supr_signal', this.fileName);
    }
}