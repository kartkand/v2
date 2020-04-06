// Minified Debounce taken from UnderscoreJS (MIT)
function debounce(a,b,c){var d;return function(){var e=this,f=arguments;clearTimeout(d),d=setTimeout(function(){d=null,c||a.apply(e,f)},b),c&&!d&&a.apply(e,f)}}

var WebGalleryTrack = WebGalleryTrack || {};

function init(){

    // Let's cache some stuff!
    var _$w = $(window),
        _$body = $("body"),
        _$thumbnailContainer = $("#thumbnailContainer"),
        _$thumbnailsParent = $("#thumbnailContainer div.thumbnails"),
        _$thumbnails = [];

    var i,
        _viewportHeight = 0,
        _thumbsToLoad = 0,
        _lastLoadedThumbIndex = -1,
        _currentRowContents = [];


    var onWindowResize = debounce(
        function(e) {
            _viewportHeight = _$w.height();
            sizeAllThumbnails();
            _$w.trigger("scroll");
        },
        250
    );

    // Set the current height
    _viewportHeight = _$w.height();
    _$w.on(
        "resize",
        onWindowResize
    );

    // Loop through the global JSON object
    for(i = 0; i < LR.images.length; i++) {
        // Set some new properties
        LR.images[i].index = i;
        LR.images[i].thumbIsLoading = false;
        LR.images[i].thumbHasLoaded = false;
        LR.images[i].aspectRatio = LR.images[i].largeWidth / LR.images[i].largeHeight;
        LR.images[i].currentThumbWidth = 0;
        LR.images[i].currentThumbHeight = 0;
        // Re-set the title if needed
        if(LR.images[i].title == "nil"){
            LR.images[i].title = "";
        }
        // Re-set the caption if needed
        if(LR.images[i].caption == "nil"){
            LR.images[i].caption = "";
        }
        // Create the individual thumbnail partial
        LR.images[i].$thumbnail = $('<a href="' + LR.images[i].url + '" target="_blank"><div class="thumbnail not-loaded"><img class="thumb-img" src="" /></div></a>');
        LR.images[i].$thumbnail.data("index", i);
        // Isolate the actual thumbnail image
        LR.images[i].$thumbnailImg = $(LR.images[i].$thumbnail.find("img")[0]);
        LR.images[i].$thumbnailImg.data("index", i);
        _$thumbnails.push(LR.images[i].$thumbnail);
    }

    initLoadOnScroll();

    function getTargetRowHeight() {
        return _$body.attr("data-target-row-height");
    }

    function renderAllThumbnails() {
        for(var i = 0; i < LR.images.length; i++){
            _$thumbnailsParent.append(LR.images[i].$thumbnail);
            LR.images[i].$thumbnailImg.attr(
                "src",
                "./static/img/favorites/" + LR.images[i].exportFilename + ".jpg"
            );
            _lastLoadedThumbIndex = LR.images[i].index;
        }
        sizeAllThumbnails();
    }

    function sizeAllThumbnails() {
        var _availableWidth = _$body.innerWidth();
        _$thumbnailContainer.css("width", _availableWidth + "px");
        _currentRowContents = [];
        var _currentRowWidth = 0;
        var _currentRowOffsetTop = 0;
        var _thumbWidth, _thumbHeight;
        for(var i = 0; i < LR.images.length; i++){
            _currentRowContents.push(LR.images[i]);
            _thumbHeight = getTargetRowHeight();
            _thumbWidth = Math.round(_thumbHeight * LR.images[i].aspectRatio);
            LR.images[i].$thumbnail.css({"width" : _thumbWidth + "px", "height" : _thumbHeight + "px"});
            LR.images[i].currentThumbWidth = _thumbWidth;
            LR.images[i].currentThumbHeight = _thumbHeight;
            _currentRowWidth += _thumbWidth;
            // if we're past our max width
            if(_currentRowWidth > _availableWidth){
                _currentRowOffsetTop += resizeRow(_currentRowContents, _availableWidth, _currentRowWidth);
                for(var j = 0; j < _currentRowContents.length; j++){
                    _currentRowContents[j].$thumbnail.data("currentRowOffsetTop", _currentRowOffsetTop);
                }
                _currentRowContents = [];
                _currentRowWidth = 0;
            }
            else {
                LR.images[i].$thumbnail.data("currentRowOffsetTop", _currentRowOffsetTop);
            }
        }
    }

    function resizeRow(rowArray, availableWidth, currentWidth){
        var _reductionRatio = availableWidth / currentWidth;
        var _newCurrentWidth = 0;
        for(var i = 0; i < rowArray.length; i++){
            var _thumbHeight = Math.floor(rowArray[i].currentThumbHeight * _reductionRatio);
            var _thumbWidth = Math.floor(rowArray[i].currentThumbWidth * _reductionRatio);
            _newCurrentWidth += _thumbWidth;
            if(i == rowArray.length - 1 && _newCurrentWidth < availableWidth){
                _thumbWidth += (availableWidth - _newCurrentWidth);
            }
            rowArray[i].$thumbnail.css({"width" : _thumbWidth + "px", "height" : _thumbHeight + "px"});
            rowArray[i].currentThumbWidth = _thumbWidth;
            rowArray[i].currentThumbHeight = _thumbHeight;
        }
        return _thumbHeight + parseInt(rowArray[0].$thumbnail.css("margin-bottom"), 10);
    }

    // Pagination Style: "scroll"

    function initLoadOnScroll() {

        if(LR.images.length == 0){
            return;
        }

        var _bodyHeight = _$body.height();


        // First, we need to create a container for every image in the gallery
        for(var i = 0; i < LR.images.length; i++){
            _$thumbnailsParent.append(LR.images[i].$thumbnail);
        }

        // Size them all based on the current viewport dimensions
        sizeAllThumbnails();

        // Loop through them, and intiate loading on anything that's visible within the current viewport

        for(var i = 0; i < LR.images.length; i++){
            if(LR.images[i].$thumbnail.data("currentRowOffsetTop") < _$w.height() + 100){
                LR.images[i].$thumbnailImg.on(
                    "load",
                    onThumbnailImgLoad
                );
                LR.images[i].$thumbnailImg.on(
                    "error",
                    onThumbnailImgError
                );
               LR.images[i].$thumbnailImg.attr(
                "src",
                "./static/img/favorites/" + LR.images[i].exportFilename + ".jpg"
                );
                _lastLoadedThumbIndex = LR.images[i].index; 
            }
        }

        _$w.on(
            "scroll",
            onWindowLoadScroll
        );
    }

    function onWindowLoadScroll(e) {
        checkForSpace();
    }

    function checkForSpace(){
        loadMoreThumbnails(_lastLoadedThumbIndex + 1, 1);
    }

    function loadMoreThumbnails(startIndex, numRows) {
        var _currentRowOffsetTop = LR.images[_lastLoadedThumbIndex].$thumbnail.data("currentRowOffsetTop");
        var _rowsAdded = 0;
        var _newRowOffsetTop = _currentRowOffsetTop;
        for(var i = startIndex; i < LR.images.length; i++){
            if(LR.images[i] == undefined){
                break;
            }

            // Fill up the last row - there could be space in it after a viewport resize
            if(LR.images[i].$thumbnail.data("currentRowOffsetTop") == _currentRowOffsetTop){
                LR.images[i].$thumbnailImg.on(
                    "load",
                    onThumbnailImgLoad
                );
                LR.images[i].$thumbnailImg.on(
                    "error",
                    onThumbnailImgError
                );
                LR.images[i].$thumbnailImg.attr(
                    "src",
                    "./static/img/favorites/" + LR.images[i].exportFilename + ".jpg"
                );
                _lastLoadedThumbIndex = LR.images[i].index;
            }
            else if(LR.images[i].$thumbnail.data("currentRowOffsetTop") > _currentRowOffsetTop){
                _rowsAdded ++;

                if(_rowsAdded > numRows){
                    break;
                }

                _currentRowOffsetTop = LR.images[i].$thumbnail.data("currentRowOffsetTop");
                LR.images[i].$thumbnailImg.on(
                    "load",
                    onThumbnailImgLoad
                );
                LR.images[i].$thumbnailImg.on(
                    "error",
                    onThumbnailImgError
                );
                LR.images[i].$thumbnailImg.attr(
                    "src",
                    "./static/img/favorites/" + LR.images[i].exportFilename + ".jpg"
                );
                _lastLoadedThumbIndex = LR.images[i].index;
            }

            
        }
    }

    function onThumbnailImgLoad(e) {
        var $el = $(e.currentTarget);
        $el.parent().css(
            {
                "background-image"      : "url('" + $el.attr("src") + "')",
                "background-size"       : "cover",
                "background-position"   : "center center"
            }
        );
        $el.css("display", "none");
        $el.parent().removeClass("not-loaded");
        if(_thumbsToLoad > 0){
            _thumbsToLoad--;
        }
        else {
            checkForSpace();
        }
    }

    function onThumbnailImgError(e) {
        // we should inject an SVG or something here so that the thumbnail grid doesn't become oddly sized
        if(_thumbsToLoad > 0){
            _thumbsToLoad--;
        }
        else {
            checkForSpace();
        }
    }

    // This was taken from Mozilla's MDN reference: https://developer.mozilla.org/en-US/docs/Web/Guide/API/DOM/Using_full_screen_mode#Browser_compatibility
    // At author-time, this API is still very much in flux and not consistent between browsers, as shown by the conditionals below:

    function toggleFullScreen(e) {
        if (!document.fullscreenElement &&    // alternative standard method
            !document.mozFullScreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement ) {  // current working methods
            if (document.documentElement.requestFullscreen) {
                document.documentElement.requestFullscreen();
            }
            else if (document.documentElement.msRequestFullscreen) {
                document.documentElement.msRequestFullscreen();
            }
            else if (document.documentElement.mozRequestFullScreen) {
                document.documentElement.mozRequestFullScreen();
            }
            else if (document.documentElement.webkitRequestFullscreen) {
                document.documentElement.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
            }
        }
        else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
            else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
            else if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            }
            else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            }
        }
    }

    // Put some stuff in the global scope so that Live Update can trigger it
    WebGalleryTrack.sizeAllThumbnails = sizeAllThumbnails;

}

$(document).ready(function(){
    init();
});