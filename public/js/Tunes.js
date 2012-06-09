(function($) {

    window.Track = Backbone.Model.extend({

    })

    window.SearchResults = Backbone.Collection.extend({
        model: Track,
        baseUrl: 'http://ws.spotify.com/search/1/album?',
        url: "",

        parse: function(data) {
            var parsed=[];
            $(data).find('album').each(function (index) {
                var albumName = $(this).children('name').text();
                var artistName = $(this).children('artist').children('name').text();
                parsed.push({ name: albumName, artist: artistName });
            });
            return parsed;
        },

        fetch: function(options) {
            options || (options = {});
            options.dataType="xml";
            this.url = this.baseUrl + options.params;
            Backbone.Collection.prototype.fetch.call(this, options);
        }
    });


    window.Album = Backbone.Model.extend({

        isFirstTrack: function(index) {
            return index == 0;
        },

        isLastTrack: function(index) {
            return index >= this.get('tracks').length - 1;
        },

        trackUrlAtIndex: function(index) {
            if (this.get('tracks').length >= index) {
                return this.get('tracks')[index].url;
            }
            return null;
        },

        addTrack: function(track){
            this.get('tracks').push(track);
            window.App.playlistView.render(); // TODO: THIS IS A HACK data change in this model should trigger render of view automatically
        }

    });

    window.Albums = Backbone.Collection.extend({
        model: Album
        ,  url: "/albums"
    });

    window.Playlist = Albums.extend({

        isFirstAlbum: function(index) {
            return (index == 0)
        },

        isLastAlbum: function(index) {
            return (index == (this.models.length - 1))
        }



    });

    window.Player = Backbone.Model.extend({
        defaults: {
            'currentAlbumIndex': 0,
            'currentTrackIndex': 0,
            'state': 'stop'
        },

        initialize: function() {
            this.playlist = new Playlist();
        },

        reset: function() {
            this.set({
                'currentAlbumIndex': 0,
                'currentTrackIndex': 0,
                'state': 'stop'
            });
        },

        play: function() {
            this.set({
                'state': 'play'
            });
            this.trigger('change:currentTrackIndex');
            this.logCurrentAlbumAndTrack();
        },

        pause: function() {
            this.set({
                'state': 'pause'
            });
        },

        isPlaying: function() {
            return (this.get('state') == 'play');
        },

        isStopped: function() {
            return (!this.isPlaying());
        },

        currentAlbum: function() {
            return this.playlist.at(this.get('currentAlbumIndex'));
        },

        currentTrackUrl: function() {
            var album = this.currentAlbum();
            if (album) {
                return album.trackUrlAtIndex(this.get('currentTrackIndex'));
            } else {
                return null;
            }
        },

        nextTrack: function() {
            var currentTrackIndex = this.get('currentTrackIndex'),
            currentAlbumIndex = this.get('currentAlbumIndex');
            if (this.currentAlbum().isLastTrack(currentTrackIndex)) {
                if (this.playlist.isLastAlbum(currentAlbumIndex)) {
                    this.set({
                        'currentAlbumIndex': 0
                    });
                    this.set({
                        'currentTrackIndex': 0
                    });
                } else {
                    this.set({
                        'currentAlbumIndex': currentAlbumIndex + 1
                    });
                    this.set({
                        'currentTrackIndex': 0
                    });
                }
            } else {
                this.set({
                    'currentTrackIndex': currentTrackIndex + 1
                });
            }
            this.logCurrentAlbumAndTrack();
        },

        prevTrack: function() {
            var currentTrackIndex = this.get('currentTrackIndex'),
            currentAlbumIndex = this.get('currentAlbumIndex'),
            lastModelIndex = 0;
            if (this.currentAlbum().isFirstTrack(currentTrackIndex)) {
                if (this.playlist.isFirstAlbum(currentAlbumIndex)) {
                    lastModelIndex = this.playlist.models.length - 1;
                    this.set({
                        'currentAlbumIndex': lastModelIndex
                    });
                } else {
                    this.set({
                        'currentAlbumIndex': currentAlbumIndex - 1
                    });
                }
                // In either case, go to last track on album
                var lastTrackIndex =
                this.currentAlbum().get('tracks').length - 1;
                this.set({
                    'currentTrackIndex': lastTrackIndex
                });
            } else {
                this.set({
                    'currentTrackIndex': currentTrackIndex - 1
                });
            }
            this.logCurrentAlbumAndTrack();
        },

        logCurrentAlbumAndTrack: function() {
            console.log("Player " +
            this.get('currentAlbumIndex') + ':' +
            this.get('currentTrackIndex'), this);
        }

    });

    window.search = new SearchResults();
    // window.library = new Albums([{
    //     "title": "Where the Earth Meets the Sky",
    //     "artist": "Tom Heasley",
    //     "tracks": [{
    //         "title": "Ground Zero",
    //         "url": "/music/blue.mp3"
    //     },
    //     {
    //         "title": "Western Sky",
    //         "url": "/music/jazz.mp3"
    //     },
    //     {
    //         "title": "Monterey Bay",
    //         "url": "/music/nore.mp3"
    //     }]
    // }]);



    
    window.player = new Player();


    $(document).ready(function() {

        window.TrackView = Backbone.View.extend({
            template: _.template($("#track-template").html()),
            tag: 'li',
            className: 'track',

            initialize: function() {
                _.bindAll(this, 'render');
            },

            render: function() {
                $(this.el).html(this.template(this.model.toJSON()));

                $addBtn = this.$(".add-to-playlist");
                
                $addBtn.click(function(event){
                    event.preventDefault();

                    $playlistsSelect = $(this).parent().children('select.playlists');
                    var track_title = $(this).parent().children('.track-name').html() + " - " + $(this).parent().children('.track-artist').html()
                    $playlistsSelect.html("<option>add to:</option>");
                    $.each(window.App.playlistView.collection.pluck('title'), function(key, value) {
                        $playlistsSelect.append($("<option></option>")
                        .attr("value",key)
                        .text(value)); 
                    });

                    $playlistsSelect.change(function() {
                       
                        // # set url to one of possible 3 files on the server
                        var track_url = ["/music/blue.mp3","/music/jazz.mp3","/music/minimalish.mp3","/music/slower.mp3"][(function(){return  Math.floor(Math.random()*3);})()] ;


                        window.App.playlistView.collection.at($(this).val()).addTrack({
                            "title": track_title,
                            "url": track_url
                        });
                        $playlistsSelect.hide();
                    });

                    $playlistsSelect.show();

                });
                return this;
            }
        });

        window.AlbumView = Backbone.View.extend({
            template: _.template($("#album-template").html()),
            tag: 'li',
            className: 'album',

            initialize: function() {
                _.bindAll(this, 'render');
            },

            render: function() {
                $(this.el).html(this.template(this.model.toJSON()));
                return this;
            }
        });

        window.PlaylistAlbumView = AlbumView.extend({
            events: {
                'click .queue.remove': 'removeFromPlaylist',
                'click .album-title': 'editAlbumTitle',
                

            },

            initialize: function() {
                _.bindAll(this, 'render',
                                'updateState',
                                'updateTrack',
                                'remove');

                this.player = this.options.player;
                this.player.bind('change:state', this.updateState);
                this.player.bind('change:currentTrackIndex', this.updateTrack);

                this.model.bind('remove', this.remove);
            },

            render: function() {
                $(this.el).html(this.template(this.model.toJSON()));
                this.updateTrack();
                return this;
            },

            updateState: function() {
                var isAlbumCurrent = (this.player.currentAlbum() === this.model);
                $(this.el).toggleClass('current', isAlbumCurrent);
            },

            updateTrack: function() {
                var isAlbumCurrent = (this.player.currentAlbum() === this.model);
                if (isAlbumCurrent) {
                    var currentTrackIndex = this.player.get('currentTrackIndex');
                    this.$("li").each(function(index, el) {
                        $(el).toggleClass('current', index == currentTrackIndex);
                    });
                }
                this.updateState();
            },

            editAlbumTitle:function(){
                console.log('hi');

            },

            removeFromPlaylist: function() {
                this.options.playlist.remove(this.model);
                this.player.reset();
            }
        });

        window.LibraryAlbumView = AlbumView.extend({
            events: {
                'click .queue.add': 'select'
            },

            select: function() {
                this.collection.trigger('select', this.model);
            }
        });

        window.PlaylistView = Backbone.View.extend({
            tag: 'section',
            className: 'playlist',
            template: _.template($("#playlist-template").html()),

            events: {
                'click .play': 'play',
                'click .pause': 'pause',
                'click .next': 'nextTrack',
                'click .prev': 'prevTrack',
                'click #new-playlist': 'newPlaylist'
            },

            initialize: function() {
                _.bindAll(this, 'render',
                'renderAlbum',
                'updateState',
                'updateTrack',
                'queueAlbum');
                this.collection.bind('reset', this.render);
                this.collection.bind('add', this.renderAlbum);

                this.player = this.options.player;
                this.player.bind('change:state', this.updateState);
                this.player.bind('change:currentTrackIndex', this.updateTrack);
                this.createAudio();

                // this.library = this.options.library;
                // this.library.bind('select', this.queueAlbum);

                track_queue = new window.Album({
                    "title": "Current Queue",
                    "artist": "",
                    "tracks": [{
                        "title": "Ground Zero",
                        "url": "/music/jazz.mp3"
                    }]
                });

                this.collection.add(track_queue);
            },

            createAudio: function() {
                this.audio = new Audio();
            },

            render: function() {
                $(this.el).html(this.template(this.player.toJSON()));
                this.collection.each(this.renderAlbum);

                this.updateState();

                return this;
            },

            renderAlbum: function(album) {
                var view = new PlaylistAlbumView({
                    model: album,
                    player: this.player,
                    playlist: this.collection
                });
                this.$("ul").append(view.render().el);

            },

            updateState: function() {
                this.updateTrack();
                this.$("button.play").toggle(this.player.isStopped());
                this.$("button.pause").toggle(this.player.isPlaying());
            },

            updateTrack: function() {
                this.audio.src = this.player.currentTrackUrl();
                if (this.player.get('state') == 'play') {
                    this.audio.play();
                } else {
                    this.audio.pause();
                }
            },

            newPlaylist: function(){
                this.collection.add({
                    "title": "New Playlist",
                    "artist": "",
                    "tracks": []
                    });
            },

            queueAlbum: function(album) {
                this.collection.add(album);
            },

            play: function() {
                this.player.play();
            },

            pause: function() {
                this.player.pause();
            },

            nextTrack: function() {
                this.player.nextTrack();
            },

            prevTrack: function() {
                this.player.prevTrack();
            }
        });

        window.SearchView = Backbone.View.extend({
            tagName: 'section',
            className: 'search',
            template: _.template($('#search-template').html()),

            initialize: function() {
                _.bindAll(this, 'render');
                this.collection.bind('reset', this.render);
            },

            render: function() {
                var $tracks,
                collection = this.collection;

                $(this.el).html(this.template({}));
                $tracks = this.$(".tracks");
                this.collection.each(function(track) {
                    var view = new TrackView({
                        model: track,
                        collection: collection
                    });
                    $tracks.append(view.render().el);
                });

                $searchForm = this.$("form");

                $searchBtn = this.$("#search-btn");
                $searchBtn.click(function(event){
                    event.preventDefault();
                    collection.fetch({params:$searchForm.serialize()});
                });

                return this;
            }

            
        });

        // window.LibraryView = Backbone.View.extend({
        //     tagName: 'section',
        //     className: 'library',
        //     template: _.template($('#library-template').html()),

        //     initialize: function() {
        //         _.bindAll(this, 'render');
        //         this.collection.bind('reset', this.render);
        //     },

        //     render: function() {
        //         var $albums,
        //         collection = this.collection;

        //         $(this.el).html(this.template({}));
        //         $albums = this.$(".albums");
        //         this.collection.each(function(album) {
        //             var view = new LibraryAlbumView({
        //                 model: album,
        //                 collection: collection
        //             });
        //             $albums.append(view.render().el);
        //         });

        //         return this;
        //     }
        // });

        window.MusicPlayer = Backbone.Router.extend({
            routes: {
                '': 'home',
                'blank': 'blank'
            },

            initialize: function() {
                this.playlistView = new PlaylistView({
                    collection: window.player.playlist,
                    player: window.player,
                    library: window.library,
                    search: window.search
                });

                // this.libraryView = new LibraryView({
                //     collection: window.library
                // });

                this.searchView = new SearchView({
                    collection: window.search
                });


            },

            home: function() {
                $('#container').empty();
                $("#container").append(this.playlistView.render().el);
                $("#container").append(this.searchView.render().el);
                // $("#container").append(this.libraryView.render().el);
            },

            blank: function() {
                $('#container').empty();
                $('#container').text('blank');
            }
        });



        // window.LibraryView.collection.queueAlbum(track_queue);

        // Kick off the application
        window.App = new MusicPlayer();
        Backbone.history.start({
            pushState: true
        });
    });



})(jQuery);
