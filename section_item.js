
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
const TaskItem = Extension.imports.task_item;
const EntryItem = Extension.imports.entry_item.EntryItem;
const RenameDialog = Extension.imports.rename_dialog.RenameDialog;

const BASE_TASKS = "";

// Read more: http://blog.fpmurphy.com/2011/04/replace-gnome-shell-activities-text-string-with-icon.html#ixzz3ndrA3Jrl



// TodoList object
function SectionItem(name, dir){
	this._init(name, dir);
}

SectionItem.prototype = {
	__proto__ : PopupMenu.PopupSubMenuMenuItem.prototype,
	_init: function(fileName, directory){
		// Fill section from the associated file
		this.sectionFile = directory+fileName+'.tasks';
		this.n_tasks = 0;
		this.fileName = fileName;
		this.directory = directory;
		PopupMenu.PopupSubMenuMenuItem.prototype._init.call(this, fileName);
		let logo = new St.Icon({icon_size: 10, icon_name: 'gtk-close', style_class: 'icon_sec'});
		this.supr = new St.Button({ style_class: 'sec_supr'});
		this.supr.add_actor(logo)
		this.actor.add_actor(this.supr);
		this.new_task = Lang.bind(this, function(item, text){
					this._add_task(text);
					this._draw_section('New task');
				});
		this._draw_section('init');
		this.actor.connect('button-release-event', 
						   Lang.bind(this, this._clicked));
	},
	_clicked : function(actor, ev){
		var double_click = ev.get_click_count() == 2;

		// Add rename on double click
		if (double_click){
			global.log('Double click!');
			let mod = new RenameDialog(this.fileName);
			mod.set_callback(Lang.bind(this, this._rename));
			mod.open();
		}
	},
	_draw_section: function(caller){
		this._clear();
		//this.menu.removeAll();

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
				let taskItem = new TaskItem.TaskItem(taskText[i]);
				let textClicked = taskText[i];
				taskItem._set_supr_callback(Lang.bind(this, function(){
					this._remove_task(textClicked);
					this._draw_section('Remove task');
				}));
				taskItem.connect('name_changed', 
							 Lang.bind(this, function(o, oldtext, new_text){
							 	this._remove_task(oldtext);
							 	this._add_task(new_task);
							 	this._draw_section();
							 }));
				this.menu.addMenuItem(taskItem);
				this.n_tasks++;
			}
		}
		this.label.set_text(this.fileName + " (" + this.n_tasks + ")");
		diff = diff - this.n_tasks;
		this.emit('task_count_changed', diff);
		if(this.n_tasks == 0)
			this.supr.show();
		let entry_task = new EntryItem();
		entry_task.connect('new_task', this.new_task);
		this.menu.addMenuItem(entry_task);
		return this;
	},
	_add_task : function(text){
		// Don't add empty task
		if (text == '' || text == '\n')
			return;
		log("DEBUG: Add task "+ text);
		// Append to content
		let content = this._read(false);
		content = content + text + "\n";
		this._write(content);
	},
	_remove_task : function (text){
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
		
		// Write new text to file
		this._write(newText);
	},
	_rename : function(text){
		if(text == this.fileName || text.length == 0){
			return
		}

		// Copy the task list to a new location
		let newSectionFile = this.directory+text+'.tasks';
		let cmd_line = "cp '"+this.sectionFile+"' '"+newSectionFile+"'";
		var r = GLib.spawn_command_line_sync(cmd_line, null);
		log('Result for copy: '+cmd_line + " -> " + r);

		// Emit signal so todolist clean up
		this.emit('name_changed', this.fileName, text);

		// Change the class variables
		this.fileName = text;
		this.sectionFile = newSectionFile;

	},

	_set_supr_callback: function(callback){
		this.supr.connect('clicked', callback);
	},
	_clear : function(){
		for each (var item in this.menu._getMenuItems())
			item._destroy();
		this.menu.removeAll();	

	},
	_read:  function(create){
		let file = this.sectionFile
		// Check if file exists
		if (!GLib.file_test(file, GLib.FileTest.EXISTS)){
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
	_write : function(content){
		// Write new text to file
		let file = this.sectionFile
		let f = Gio.file_new_for_path(file);
		let out = f.replace(null, false, Gio.FileCreateFlags.NONE, null);
		Shell.write_string_to_stream (out, content);
		out.close(null);
	}
}