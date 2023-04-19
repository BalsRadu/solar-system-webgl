(function ($) {

    $.fn.progressInitialize = function () {

        return this.each(function () {

            var button = $(this),
                progress = 0;


            var options = $.extend({
                type: 'background-horizontal',
                loading: 'Loading',
                finished: 'Done'
            }, button.data());

            button.attr({'data-loading': options.loading, 'data-finished': options.finished});


            var bar = $('<span class="tz-bar ' + options.type + '">').appendTo(button);


            button.on('progress', function (e, val, absolute, finish) {

                if (!button.hasClass('in-progress')) {


                    bar.show();
                    progress = 0;
                    button.removeClass('finished').addClass('in-progress')
                }

                if (absolute) {
                    progress = val;
                }
                else {
                    progress += val;
                }

                if (progress >= 100) {
                    progress = 100;
                }

                setProgress(progress);
            });

            function setProgress(percentage) {
                bar.filter('.background-horizontal,.background-bar').width(percentage + '%');
                bar.filter('.background-vertical').height(percentage + '%');
            }

        });

    };


    $.fn.progressStart = function () {

        var button = this.first(),
            last_progress = new Date().getTime();

        if (button.hasClass('in-progress')) {
            return this;
        }

        button.on('progress', function () {
            last_progress = new Date().getTime();
        });

        var interval = window.setInterval(function () {

            if (new Date().getTime() > 2000 + last_progress) {
                button.progressIncrement(5);
            }

        }, 500);

        button.on('progress-finish', function () {
            window.clearInterval(interval);
        });

        return button.progressIncrement(10);
    };

    $.fn.progressFinish = function () {
        return this.first().progressSet(100);
    };

    $.fn.progressIncrement = function (val) {

        val = val || 10;

        var button = this.first();

        button.trigger('progress', [val])

        return this;
    };

    $.fn.progressSet = function (val) {
        val = val || 10;

        var finish = false;
        if (val >= 100) {
            finish = true;
        }

        return this.first().trigger('progress', [val, true, finish]);
    };


    $.fn.progressTimed = function (seconds, cb) {

        var button = this.first(),
            bar = button.find('.tz-bar');

        if (button.is('.in-progress')) {
            return this;
        }

        bar.css('transition', seconds + 's linear');
        button.progressSet(99);

        window.setTimeout(function () {
            bar.css('transition', '');
            button.progressFinish();

            if ($.isFunction(cb)) {
                cb();
            }

        }, seconds * 1000);
    };

    function PreLoad(imgs, options) {
        this.imgs = (typeof imgs === 'string') ? [imgs] : imgs;
        this.opts = $.extend({}, PreLoad.DEFAULTS, options);

        if (this.opts.order === 'ordered') {
            this._ordered();
        } else {
            this._unordered();
        }
    }

    PreLoad.DEFAULTS = {
        order: 'unordered', 
        each: null, 
        all: null 
    };
    PreLoad.prototype._ordered = function () {
        var imgs = this.imgs,
            opts = this.opts,
            count = 0,
            len = imgs.length;

        function load() {
            var imgObj = new Image();

            $(imgObj).on('load error', function () {
                opts.each && opts.each(count);
                if (count >= len) {
                    
                    opts.all && opts.all();
                } else {
                    load();
                }

                count++;
            });

            imgObj.src = imgs[count];
        }

        load();
    };
    PreLoad.prototype._unordered = function () {

        var imgs = this.imgs,
            opts = this.opts,
            count = 0,
            len = imgs.length;

        $.each(imgs, function (i, src) {
            if (typeof src != 'string') return;

            var imgObj = new Image();

            $(imgObj).on('load error', function () {

                opts.each && opts.each(count);

                if (count >= len - 1) {
                    opts.all && opts.all();
                }
                count++;
            });

            imgObj.src = src;
        });
    };


    $.extend({
        preLoad: function (imgs, opts) {
            new PreLoad(imgs, opts);
        }
    });

})(jQuery);