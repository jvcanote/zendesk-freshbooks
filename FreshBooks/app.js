(function() {

  return {
    //Local vars
    clients:    [],
    memberID:   undefined,
    notes:      '',
    hours:      '',
    projectID:  undefined,
    projects:   [],
    tasks:      [],
    users:      [],

    defaultState: 'loading',

    requests: {
      loadClients:  function(data, userID) { return this._postRequest(data, userID); },
      loadProjects: function(data, userID) { return this._postRequest(data, userID); },
      loadTasks:    function(data, userID) { return this._postRequest(data, userID); },
      loadUsers:    function(data, userID) { return this._postRequest(data, userID); },
      postHours:    function(data, userID) { return this._postRequest(data, userID); }
    },

    events: {
      'click .back':                            'backToForm',
      'click .hours .logout':                   'logout',
      'click .hours .submit':                   'submitHours',
      'click .users .submit':                   'submitUser',
      'change .hours select[name=project_id]':  'changeProject',
      'change .hours select[name=task_id]':     'enableInput',
      'keypress .hours input[name=hours]':      'maskUserInput',

      'app.activated': 'firstRequest',

      /** AJAX callbacks **/
      'loadClients.done':  'handleLoadClientsResult',
      'loadProjects.done': 'handleLoadProjectsResult',
      'loadTasks.done':    'handleLoadTasksResult',
      'loadUsers.done':    'handleLoadUsersResult',
      'postHours.done':    'handlePostHoursResult',
      'loadClients.fail':     'handleFailedRequest',
      'loadProjects.fail':    'handleFailedRequest',
      'loadTasks.fail':       'handleFailedRequest',
      'loadUsers.fail':       'handleFailedRequest',
      'postHours.fail':       'handleFailedRequest'
    },

    backToForm: function() {
      this.switchTo('hours');
    },

    changeProject: function() {
      var form = this.$('.hours form'), projectID = form.find('select[name=project_id]').val();

      if ( projectID.length === 0 )
        return;

      // Save data to repopulate when we redraw form
      this.hours = form.find('input[name=hours]').val();
      this.notes = form.find('textarea[name=notes]').val();
      this.projectID = projectID;
      this.tasks = [];

      this.disableInput(form);
      this.ajax('loadTasks', this._requestTaskList({ page: 1, projectID: this.projectID }), this.settings.token);
    },

    firstRequest: function(data) {
      var firstLoad = data && data.firstLoad;
      if ( !firstLoad ) { return; }

      this._resetLocalVars();
      this.ajax('loadUsers', this._requestStaffList({ page: 1 }), this.settings.token);
    },

    handleLoadClientsResult: function(data) {
      var self = this, client, clients = this.$(data).find('clients'), page = parseInt(clients.attr('page'), 10), pages = parseInt(clients.attr('pages'), 10);

      clients.children('client').each(function(index, el) {
        client = self.$(el);
        self.clients[client.children('client_id').text()] = client.children('organization').text();
      });

      if (page < pages) {
        this.ajax('loadClients', this._requestProjectList({ page: (page + 1) }), this.settings.token);
      } else {
        this.ajax('loadProjects', this._requestProjectList({ page: 1 }), this.settings.token);
      }
    },

    handleLoadProjectsResult: function(data) {
      var client, form = this.$('.hours form'), name, notes, self = this, project, projects = this.$(data).find('projects'),
          page = parseInt(projects.attr('page'), 10), pages = parseInt(projects.attr('pages'), 10), results = [];

      projects.children('project').each(function(index, el) {
        project = self.$(el);
        client =  self.clients[project.children('client_id').text()];
        name =    project.children('name').text();

        if (client)
          name = helpers.fmt("%@ - %@", name, client);

        results.push({
          id: project.children('project_id').text(),
          name: name
        });
      });

      this.projects = this.projects.concat(results);

      if (this.projects.length === 0) {
        this.showError(this.I18n.t('projects.not_found'));
      } else if (page < pages) {
        this.ajax('loadProjects', this._requestProjectList({ page: (page + 1) }), this.settings.token);
      } else {
        notes = this.I18n.t('form.note_text', { ticketID: this.ticket().id() });

        this.switchTo('hours', { projects: this.projects, notes: notes });
      }
    },

    handleLoadTasksResult: function(data) {
      var form, self = this, task, tasks = this.$(data).find('tasks'), page = parseInt(tasks.attr('page'), 10), pages = parseInt(tasks.attr('pages'), 10), results = [];

      tasks.children('task').each(function(index, el) {
        task = self.$(el);
        results.push({
          id: task.children('task_id').text(),
          name: task.children('name').text()
        });
      });

      this.tasks = this.tasks.concat(results);

      if (page < pages) {
        this.ajax('loadTasks', this._requestTaskList({ page: (page + 1), projectID: this.projectID }), this.settings.token);
      } else {
        this.switchTo('hours', { projects: this.projects, hours: this.hours, notes: this.notes, tasks: this.tasks });

        form = this.$('.hours form');
        this.enableInput(form);
        form.find('select[name=project_id]').val(this.projectID);
      }
    },

    handleLoadUsersResult: function(data) {
      var member, self = this, results = [], staffMembers = this.$(data).find('staff_members'), page = parseInt(staffMembers.attr('page'), 10), pages = parseInt(staffMembers.attr('pages'), 10);

      staffMembers.children('member').each(function(index, el) {
        member = self.$(el);
        results.push({
          id:   member.children('staff_id').text(),
          name: helpers.fmt("%@ %@", member.children('first_name').text(), member.children('last_name').text())
        });
      });

      this.users = this.users.concat(results);

      if (this.users.length === 0) {
        this.showError(this.I18n.t('users.not_found'));
      } else if (page < pages) {
        this.ajax('loadUsers', this._requestStaffList({ page: (page + 1) }), this.settings.token);
      } else {
        this.switchTo('users', { users: this.users });
      }
    },

    handlePostHoursResult: function(data) {
      var form, response = this.$(data).find('response');

      if (response.attr('status') === 'fail') {
        this.showError(response.find('error').text(), 'error');
      } else {
        services.notify(this.I18n.t('form.success'));
        form = this.$('.hours form');
        form.find('input[name=hours]').val('');
        form.find('textarea[name=notes]').val(this.I18n.t('form.note_text', { ticketID: this.ticket().id() }));
      }

      this.enableInput(this.$('.hours form'));
    },

    logout: function() {
      var form = this.$('.hours form');

      this.disableInput(form);
      this.firstRequest();
    },

    maskUserInput: function(event) {
      var charCode = event.which, value = event.target.value;

      if (charCode > 58 || (charCode < 48 && charCode !== 46 && charCode !== 8) ) { // Not number, '.', ':' or Backspace
        return false;
      } else if ((charCode === 46 || charCode === 58) && (value.search(/\./) > -1 || value.search(/:/) > -1)) { // Only one '.' OR one ':'
        return false;
      }
    },

    submitHours: function() {
      var field, form = this.$('.hours form'), name, options = {}, passed = true, self = this;

      form.find(':input')
          .not(':button, :submit, :reset, :hidden')
          .not('textarea')
          .each(function(index, el) {
            field = self.$(el);
            name = field.attr('name');

            if (!field.val()) {
              alert( self.I18n.t('form.empty', { field: name.replace('_id', '').capitalize() }) );
              passed = false;
            }

            options[name] = field.val();
          });

      if (!passed)
        return false;

      options.staff_id = this.memberID;
      this.disableInput(form);
      this.ajax('postHours', this._requestTimeEntryCreate(options), this.settings.token);
    },

    submitUser: function() {
      var form =    this.$('.users form'),
          select =  form.find('select');

      if ( !select.val() ) {
        alert(this.I18n.t('users.not_selected'));
        return false;
      }

      this.memberID = select.val();
      this.disableSubmit(form);
      this.ajax('loadClients', this._requestClientList({ page: 1 }), this.settings.token);
    },

    _postRequest: function(data, userID) {
      return {
        data:         data,
        dataType:     'xml',
        type:         'POST',
        url:          this.settings.url,
        headers:      {
          'Authorization': 'Basic ' + Base64.encode(helpers.fmt('%@:X', userID))
        }
      };
    },

    _requestClientList: function(options) {
      return this._requestPaginated('client.list', options.page);
    },

    _requestTimeEntryCreate: function(options) {
      return this.renderAndEscapeXML( 'time_entry.xml', options );
    },

    _requestPaginated: function(method, page) {
      return this.renderAndEscapeXML('paginated.xml', {
        method: method,
        page: page
      });
    },

    _requestProjectList: function(options) {
      return this._requestPaginated('project.list', options.page);
    },

    _requestStaffList: function(options) {
      return this._requestPaginated('staff.list', options.page);
    },

    _requestTaskList: function(options) {
      return this.renderAndEscapeXML( 'task_list.xml', options );
    },

    _resetLocalVars: function() {
      this.clients =    [];
      this.memberID =   undefined;
      this.notes =      '';
      this.hours =      '';
      this.projectID =  undefined;
      this.projects =   [];
      this.users =      [];
    },

    /** Helpers **/
    disableInput: function(form) {
      form.find(':input')
          .prop('disabled', true);
      form.find('a')
          .prop('disabled', true);
    },

    disableSubmit: function(form) {
      var submit = form.find('input[type=submit]');
      submit
        .data('originalValue', submit.val())
        .prop('disabled', true)
        .val(this.I18n.t('global.submitting'));
    },

    enableInput: function(form) {
      form.find(':input')
          .prop('disabled', false);
      form.find('a')
          .prop('disabled', false);
    },

    enableSubmit: function(form) {
      var submit = this.$(form.find('input[type=submit]'));
      submit
        .prop('disabled', false)
        .val(submit.data('originalValue'));
    },

    handleFailedRequest: function(jqXHR, textStatus, errorThrown) { this.showError( this.I18n.t('problem', { error: errorThrown.toString() }) ); },

    showError: function(msg) {
      this.switchTo('submitFail', { message: msg });
    },

    renderAndEscapeXML: function(templateName, data) {
      Object.keys(data).forEach(function(key) {
        data[key] = helpers.safeString( data[key] );
      });
      return encodeURI( this.renderTemplate(templateName, data) );
    }
  };

}());

