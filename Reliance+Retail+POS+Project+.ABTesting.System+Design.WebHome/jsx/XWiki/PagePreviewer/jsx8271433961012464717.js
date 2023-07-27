
var XWiki = (function (XWiki) {
  function init() {
    require(['jquery', 'bootstrap'], function ($, bootstrap) {
      var reference = XWiki.Model.resolve('XWiki.PagePreviewer', XWiki.EntityType.DOCUMENT);
      var serviceUrl = (new XWiki.Document(reference)).getURL();
      var settings = {
        trigger: 'hover',
        placement: 'auto bottom',
        container: 'body',
        delay: { 'show': 500, 'hide': 100 },
        html: true,
        selector: '.wikilink, .wikiinternallink',
        content: function() {
          // Create a random temporary id for the content's parent div
          // with a unique number just in case.
          var contentId = 'content-' + $.now();
          var imageId = 'image-' + $.now();
          var path = $(this).find('a').attr('href');
          $.ajax({
            type: 'GET',
            url: serviceUrl + '?xpage=plain&outputSyntax=plain&path=' + encodeURIComponent(path),
            cache: false,
          }).done( function(data) {
            var linkedPageContent = $('<div>' + data.html + '</div>');
            var blocks = linkedPageContent.find('p,table,ul,ol,blockquote');
            var content = '';
            if (blocks.size() > 0) {
              content = blocks[0].outerHTML;
            }
            var imageUrl = data.image;
            if (imageUrl && imageUrl.length > 0) {
              $('#' + imageId).html('<div class="col-md-12" style="text-align:center"><img src="' + imageUrl + '" /></div>');
            }
            var marginTop = '0';
            if (imageUrl && imageUrl.length > 0)
              marginTop = '1em';
              $('#' + contentId).html('<div class="col-md-12" style="margin-top:' + marginTop + '">' + content + '</div>');
          });

          var output = '';
          output += '<div class="row" id="' + imageId + '">';
          output +=   '<div class="col-md-12"></div>';
          output += '</div>';
          output += '<div class="row" id="' + contentId + '">';
          output +=   '<div class="col-md-12"><span class="fa fa-spinner fa-pulse"/></div>';
          output += '</div>';
          return output;
        }
      }

      // Enable popovers only for not touch-only browsers
      var regex = /Android|iPhone|iPad|Opera Mini/i;
      var match = navigator.userAgent.match(regex);
      if (match == null || match.length == 0) {
        $('body').popover(settings);

        // Disable popovers for internal links
        $('.wikilink').each(function() {
          var $this = $(this);
          var a = $this.find('a');
          var href = a.attr('href');
          if (href.indexOf('#') == 0) {
            $this.popover('disable');
          }
        });
      }
    });
  }
  (XWiki.domIsLoaded && init()) || document.observe('xwiki:dom:loaded', init);
  return XWiki;
}(XWiki || {}));

