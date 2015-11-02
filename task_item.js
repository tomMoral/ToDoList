
const PopupMenu = imports.ui.popupMenu;
const St = imports.gi.St;
const Gettext = imports.gettext.domain('gnome-shell');
const Gio = imports.gi.Gio;
const Lang = imports.lang;
const _ = Gettext.gettext;


// Read more: http://blog.fpmurphy.com/2011/04/replace-gnome-shell-activities-text-string-with-icon.html#ixzz3ndrA3Jrl



// TodoList object
function TaskItem(name){
	this.conn = null;
	this._init(name);
}

TaskItem.prototype = {
	__proto__ : PopupMenu.PopupBaseMenuItem.prototype,
	_init: function(name){
		PopupMenu.PopupBaseMenuItem.prototype._init.call(this);
		this.actor.add_style_class_name('task-item');
		this.name = name;
		let logo = new St.Icon({icon_size: 10, icon_name: 'gtk-close' });
		let label = new St.Label({ style_class: 'task-label', text: name,} );
		this._supr_btn = new St.Button({ style_class: 'task-supr', label: '',} );
		this._supr_btn.add_actor(logo)
		this.actor.add_actor(label);
		this.actor.add_actor(this._supr_btn);
		label.connect('button-release-event', 
						   Lang.bind(this, this._clicked));
	},
	_clicked : function(actor, ev){
		global.log('click');
		var double_click = ev.get_click_count() == 2;

		// Add rename on double click
		if (double_click){
			global.log('Double click task!');
			let mod = new RenameDialog(this.fileName);
			mod.set_callback(Lang.bind(this, this._rename));
			mod.open();
		}
	},

	_set_supr_callback: function(callback){
		if(this.conn != null)
			this._supr_btn(this.conn);
		this.conn = this._supr_btn.connect('clicked', callback);
	},
	_destroy: function(){
		if(this.conn != null)
			this._supr_btn.disconnect(this.conn);
	},
	isEntry: function(){
		return false;
	},
	_rename : function(name){
		if(name == this.name || name.length == 0){
			return
		}

		// Emit signal so todolist clean up
		this.emit('name_changed', this.name, name);

		// Change the class variables
		this.label.set_text(name);

	},
}