/**
 * Question editor namespace
 * - compomponent designed for editing of questions and answers data using for the construction of simple questionnaires.
 * - getting initial json data structure describing the questions and answers 
 * - generating the output json data structure modified during edition process  
 * 
 * Dependency
 * - jQuery (tested on 1.11.3)
 * - jQuery UI (with sortable feature)
 */
var QuestionsEditor = (function() {
	'use strict';
	
	/**
	 * Question rows internal namespace
	 * - holds question rows with numbers, texts and answer definitions
	 * - it's responsible for the navigation process of rows (moving, adding, removing)
	 * - runs question edit form
	 */
	var QuestionRows = (function() {
	
		var _root = this;
		var _$rowContainer = null;
		var _$addContainer = null;
		var _rowTemplate = null;
		var _rowCount = 0;
		var _onChange = function(){};
		
		function _init() {
			_rowTemplate = $('#qe-question-row-tpl').html();
	
			_$rowContainer = $('.qe-question-rows');
			_$rowContainer.sortable({
				placeholder : "qe-question-row qe-sortable-placeholder",
				cancel : "input, select, textarea, label, .btn, .qe-toggle",
				stop : function() {
					_renum();
					_onChange.call(_root);
				}
			});
	
			_$addContainer = $('.qe-question-row-add');
			$('.qe-question-add-button').click(function() {
				_addRow();
			});
		}
	
		function _populate(questions) {
			for (var i = 0; i < questions.length; i++) {
				var question = questions[i];
				_createRow(question, i + 1);
				_rowCount++;
			}
		}
	
		function _createRow(question, number) {
			var $row = $(_rowTemplate).appendTo(_$rowContainer);
			$row.find('*[data-toggle="tooltip"]').tooltip();
			$row.find('.qe-question-edit-button').click(function() {
				_editRow.call(_root, $(this).data('$row'));
			}).data('$row', $row);
			$row.find('.qe-question-remove-button').click(function() {
				_removeRow.call(_root, $(this).data('$row'));
			}).data('$row', $row);
			_updateRow($row, question, number);
		}
	
		function _renum() {
			_$rowContainer.find('.qe-question-row').each(function(i) {
				_updateRowNumber($(this), i + 1);
			});
		}
	
		function _addRow() {
			if (QuestionForm.isOpen()) {
				Blinker.blink(QuestionForm.getForm().parent());
				return;
			}
			$('.qe-question-add-button').fadeOut();
			QuestionForm.open({
				container : _$addContainer,
				request : {
					options : [ { type : false, text : "" } ]
				},
				onClose : function() {
					$('.qe-question-add-button').fadeIn();
				},
				onSave : function(question) {
					_rowCount++;
					_createRow(question, _rowCount);
					_onChange.call(_root);
				}
			});
		}
		
		function _editRow($row) {
			if (QuestionForm.isOpen()) {
				Blinker.blink(QuestionForm.getForm().parent());
				return;
			}
			$row.addClass('qe-state-edit');
			QuestionForm.open({
				container : $row,
				request : $row.data('question'),
				onClose : function() {
					$row.removeClass('qe-state-edit');
				},
				onSave : function(question) {
					_updateRow($row, question);
					_onChange.call(_root);
				}
			});
		}
	
		function _removeRow($row) {
			$row.fadeOut(function() {
				$(this).remove();
				_rowCount--;
				_renum();
				_onChange.call(_root);
			});
		}
	
		function _updateRow($row, question, number) {
			$row.data('question', question);
			if (typeof number !== 'undefined') {
				$row.find('.qe-question-number').text(number);
			}
			$row.find('.qe-question-text').html(question.text);
		}
	
		function _updateRowNumber($row, number) {
			$row.find('.qe-question-number').text(number);
		}
	
		return {
			init : function(questions) {
				_init();
				_populate(questions);
			},
			
			setOnChange : function(callback) {
				_onChange = callback;
			},
			
			clear : function() {
				_$rowContainer.html('');
				_rowCount = 0;
				_onChange.call(_root);
			},
	
			get : function() {
				var data = new Array();
				_$rowContainer.find('.qe-question-row').each(function() {
					data.push($(this).data('question'));
				});
				return data;
			}
		};
	})();

	/**
	 * Question form namespace
	 * - it's responsible for the editing process of the question and answers
	 */
	var QuestionForm = (function() {
	
		var _$formTemplate = null;
		var _$answerRowTemplate = null;
		var _$form = null;
		var _$answerRowsConainer = null;
		var _answerRowsCount = 0;
		var _request = null;
		var _defaultAnswerOption = null;
		var _onClose = function() {
		};
		var _onSave = function(values) {
		};
	
		function _getFormTemplate() {
			if (_$formTemplate === null) {
				_$formTemplate = $($("#qe-question-form-tpl").html()).hide();
			}
			return _$formTemplate;
		}
	
		function _getAnswerRowTemplate() {
			if (_$answerRowTemplate === null) {
				_$answerRowTemplate = $($("#qe-answer-row-tpl").html());
			}
			return _$answerRowTemplate;
		}
	
		function _dock($container) {
			_$form = $(_getFormTemplate().clone()).appendTo($container);
			_$answerRowsConainer = _$form.find('.qe-answer-rows');
			_$form.find('.qe-form-close-button').click(_onCloseClick);
			_$form.find('.qe-answer-add-button').click(_onAddAnswerClick);
			_$form.find('.qe-question-save-button').click(_onSaveClick);
	
			// bind request
			_$form.find('.qe-question-text-input').val(_request.text).show();
			for (var i = 0; i < _request.options.length; i++) {
				_populateAnswerRow(_request.options[i]);
				_answerRowsCount++;
			}
			_$form.find('.qe-answer-shuffle-checkbox').prop('checked', _request.shuffleOptions);
			_$form.find('.qe-answer-none-checkbox').prop('checked', _request.noneOption);
	
			_$form.slideDown();
		}
	
		function _populateAnswerRow(answer) {
			var $row = $(_$answerRowTemplate.clone()).appendTo(_$answerRowsConainer);
			$row.find('.qe-answer-type-select').val(answer.type !== false ? answer.type : _defaultAnswerOption.type);
			$row.find('.qe-answer-text-input').val(answer.text);
			$row.find('.qe-answer-remove-button').click(function() {
				_onAnswerRemoveClick($(this).data('$row'));
			}).data('$row', $row);
			return $row;
		}
	
		function _removeAnswerRow($row) {
			$row.slideUp(function() {
				$(this).remove();
				_answerRowsCount--;
			});
		}
		
		function _clearAnswerRow($row) {
			$row.find('.qe-answer-type-select').val(_defaultAnswerOption.type);
			$row.find('.qe-answer-text-input').val('');
		}
	
		function _setRequest(request) {
			_request = request;
		}
	
		function _getValues() {
			var values = {
				text : _$form.find('.qe-question-text-input').val(),
				options : [],
				noneOption : _$form.find('.qe-answer-none-checkbox').prop('checked'),
				shuffleOptions : _$form.find('.qe-answer-shuffle-checkbox').prop('checked')
			};
			_$form.find('.qe-answer-row').each(function() {
				values.options.push({
					type : $(this).find('.qe-answer-type-select').val(),
					text : $(this).find('.qe-answer-text-input').val(),
				});
			});
			return values;
		}
		
		function _isValid()
		{
			return Validator.validate({
				elements : _$form.find('.qe-question-text-input, .qe-answer-text-input'),
				validator : function(element, value) {
					return value.length > 0;
				}
			});
		}
		
		function _close() {
			_$form.find('.qe-question-text-input').hide();
			_$form.slideUp(function() {
				_$form.remove();
				_$form = null;
			});
			_answerRowsCount = 0;
		}
		
		function _onAddAnswerClick() {
			var $row = _populateAnswerRow({
				type : _defaultAnswerOption.type,
				text : null
			});
			_answerRowsCount++;
			$row.find('.qe-answer-text-input').focus();
		}
		
		function _onAnswerRemoveClick($row) {
			if (_answerRowsCount > 1) {
				_removeAnswerRow($row);
			} else {
				_clearAnswerRow($row);
			}
		}
	
		function _onCloseClick() {
			_close();
			_onClose.call();
		}
	
		function _onSaveClick() {
			if (!_isValid()) {
				return;
			}
			var values = _getValues();
			_close();
			_onClose.call();
			_onSave(values);
		}
	
		return {		
			open : function(options) {
				_setRequest(options.request);
				_dock(options.container);
				_onClose = options.onClose;
				_onSave = options.onSave;
				_$form.find('.qe-question-text-input').focus();
			},
			
			setAnswerTypeOptions : function(options) {
				var $answerTypeSelect = _getAnswerRowTemplate().find('.qe-answer-type-select');
				for (var i = 0; i < options.length; i++) {
					var option = options[i];
					$('<option>').appendTo($answerTypeSelect)
						.attr('value', option.type)
						.text(option.text);
					if (option.def === true) {
						_defaultAnswerOption = option;
					}
				}
			},
	
			isOpen : function() {
				return _$form !== null;
			},
			
			getForm : function() {
				return _$form;
			},
						
			reset : function() {
				if (_$form !== null) {
					_$form.remove();
					_$form = null;
					_$answerRowsConainer.html('');
					_answerRowsCount = 0;
					_onClose.call();
				}
			}
		};
	})();
	
	/**
	 * Simple validator namespace
	 * - used to validate form data
	 * - sets or reset error state on the elements
	 * - focus first invalid element
	 */
	var Validator = (function() {
		var _$elements = null;
		var _validator = function(element, value) { return true; };
		
		function _validate() {
			if (_$elements === null) {
				return true;
			}
			var valid = true;
			var focused = false;
			_$elements.each(function() {
				if (_validator(this, $(this).val())) {
					$(this).parent().removeClass('has-error');
				} else {
					$(this).parent().addClass('has-error');
					if (!focused) {
						$(this).focus();
						focused = true;
					}
					valid = false;
				}
			});
			return valid;
		};
		
		return {
			validate : function(options) {
				_$elements = options.elements;
				_validator = options.validator;
				return _validate();
			}
		};
	})();
	
	/**
	 * Background-blink widget namespace
	 * - blink background bolor of the given element
	 * - using background color property of .qe-blink css class
	 */
	var Blinker = (function() {
		var _blinkColor = $('<i>').addClass('qe-blink').css('background-color');
		return {
			blink : function($element) {
				if (typeof $element.data('bc') == 'undefined') {
					$element.data('bc', $element.css('background-color'));
				}
				$element.stop().css('background-color', _blinkColor).animate({
					backgroundColor : $element.data('bc')
				}, 1500, function() {
					$(this).removeAttr('style');
					$(this).removeData('bc');
				});
			}
		};
	})();
	
	/**
	 * External interface
	 */
	return {
		/**
		 * Initializes the component
		 * - sets the answer types
		 * - sets the questions list
		 * - sets callback function for observe changes
		 */
		init: function (options) {
			QuestionForm.setAnswerTypeOptions(options.answerTypes);
			QuestionRows.init(options.questions);
			QuestionRows.setOnChange(options.change);
		},
		
		/**
		 * Returns the current question/answer list
		 */
		getQuestions : function() {
			return QuestionRows.get();
		},

		/**
		 * Clear whole of the editor area
		 */
		clear : function() {
			QuestionForm.reset();
			QuestionRows.clear();
		},
	};
})();
