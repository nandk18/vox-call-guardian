interface GooglePlacesWindow extends Window {
  google?: {
    maps?: {
      places?: {
        AutocompleteService: new () => any;
        PlacesService: new (el: HTMLElement) => any;
      };
    };
  };
}

declare const window: GooglePlacesWindow;
