require(['jquery'], function() {
    // Menu BackToTop flottant à gauche de la page
   // Source: http://www.developerdrive.com/2013/07/using-jquery-to-add-a-dynamic-back-to-top-floating-button-with-smooth-scroll/
    var offset = 220;
    var duration = 500;
    jQuery(window).scroll(function() {
        if (jQuery(this).scrollTop() > offset) {
            jQuery('.btTop').fadeIn(duration);
            jQuery('.btHome').fadeIn(duration);
        } else {
            jQuery('.btTop').fadeOut(duration);
            jQuery('.btHome').fadeOut(duration);
        }
    });
    
    jQuery('.btTop').click(function(event) {
        event.preventDefault();
        jQuery('html, body').animate({scrollTop: 0}, duration);
        return false;
    })
});

