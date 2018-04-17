function openTab(evt) {
    // Declare all variables
    var i, tabcontent;

    // Get all elements with class="tabcontent" and hide them
    tabcontent = document.getElementsByClassName("tabcontent");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }

    // Show the current tab, and add an "active" class to the button that opened the tab
    var selectBox = document.getElementById("selectbox");
    var selectedValue = selectBox.options[selectBox.selectedIndex].value;

    document.getElementById(selectedValue).style.display = "block";
    evt.currentTarget.className += " active";
}

(function( $ ){
    $.fn.extend({
        Segment: function ( ) {

          //magic to make buttons work
			$(this).each(function (){
				var self = $(this);
				var onchange = self.attr('onchange');
				var wrapper = $("<div>",{class: "ui-segment"});
				$(this).find("option").each(function (){
					var option = $("<span>",{class: 'option',onclick:onchange,text: $(this).text(),value: $(this).val()});
					if ($(this).is(":selected")){
						option.addClass("active");
					}
					wrapper.append(option);
				});
				wrapper.find("span.option").click(function (){
					wrapper.find("span.option").removeClass("active");
					$(this).addClass("active");
					self.val($(this).attr('value'));

          //tab show/hide
          tabcontent = document.getElementsByClassName("tabcontent");
          for (i = 0; i < tabcontent.length; i++) {
              tabcontent[i].style.display = "none";
          }
          document.getElementById($(this).attr('value')).style.display = "block";
				});
				$(this).after(wrapper);
				$(this).hide();
			});
        }
    });
    
    $(".segment-select").Segment();
    $(".active").click();
})(jQuery);
