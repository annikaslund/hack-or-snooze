// global flag to easily tell if we're logged in
let LOGGED_IN = false;

// global storyList variable
let storyList;

// global user variable
let user;

// let's see if we're logged in
let token = localStorage.getItem("token");
let username = localStorage.getItem("username");

// if we are, will show create story button
if (token && username) {
  LOGGED_IN = true;
  $("#nav-create-story").show();
  $("#nav-favorites").show();
}

$(document).ready(async function() {
  // cache some selectors we'll be using quite a bit
  const $allStoriesList = $("#all-articles-list");
  const $submitForm = $("#submit-form");
  const $filteredArticles = $("#filtered-articles");
  const $loginForm = $("#login-form");
  const $createAccountForm = $("#create-account-form");
  const $ownStories = $("#my-articles");
  const $navLogin = $("#nav-login");
  const $navLogOut = $("#nav-logout");
  const $createStoryButton = $('#nav-create-story');
  const $favoriteButton = $('#nav-favorites');
  const $favoriteList = $('#favorited-articles');
  // if there is a token in localStorage, call User.stayLoggedIn
  //  to get an instance of User with the right details
  //  this is designed to run once, on page load
  if (LOGGED_IN) {
    const userInstance = await User.stayLoggedIn();
    // we've got a user instance now
    user = userInstance;

    // let's build out some stories
    await generateStories();

    // and then display the navigation
    showNavForLoggedInUser();
  } else {
    // we're not logged in, let's just generate stories and stop there
    await generateStories();
  }

  /**
   * Event listener for logging in.
   *  If successfully we will setup the user instance
   */
  $loginForm.on("submit", async function(e) {
    e.preventDefault(); // no page-refresh on submit

    // grab the username and password
    const username = $("#login-username").val();
    const password = $("#login-password").val();

    // call the login static method to build a user instance
    const userInstance = await User.login(username, password);
    // set the global user to the user instance
    user = userInstance;
    LOGGED_IN = true;
    loginAndSubmitForm();
  });

  /**
   * Event listener for signing up.
   *  If successfully we will setup a new user instance
   */
  $createAccountForm.on("submit", async function(e) {
    e.preventDefault(); // no page refresh

    // grab the required fields
    let name = $("#create-account-name").val();
    let username = $("#create-account-username").val();
    let password = $("#create-account-password").val();

    // call the create method, which calls the API and then builds a new user instance
    const newUser = await User.create(username, password, name);
    user = newUser;
    loginAndSubmitForm();
    $createStoryButton.show();
    $favoriteButton.show();
  });

  /**
   * Log Out Functionality
   */
  $navLogOut.on("click", function(e) {
    // empty out local storage
    localStorage.clear();
    // refresh the page, clearing memory
    location.reload();
  });

  /**
   * Event Handler for Clicking Login
   */
  $navLogin.on("click", function() {
    // Show the Login and Create Account Forms
    $loginForm.slideToggle();
    $createAccountForm.slideToggle();
    $allStoriesList.toggle();
  });

  // Show the create story form wheb create story link clicked.
    $createStoryButton.on("click", function() {
    $submitForm.slideToggle();
    $allStoriesList.toggle();
  });

  // On click, this collects author, title, url, converts this to an object,
  // Passes this object, as well as user and toke to API via
  // story instance method addStory.
  // What addStroy returns, append to DOM
  $("#submit-form").on("submit", async function(e) {
    e.preventDefault();
    const author = $("#author").val();
    const title = $("#title").val();
    const url = $("#url").val();
    
    let storyObj = {
      author: author,
      title: title,
      url: url
      }
    let story = await storyList.addStory(user, storyObj);
    let htmlResponse = generateStoryHTML(story);
    $allStoriesList.prepend(htmlResponse);
    $submitForm.slideToggle();
    $allStoriesList.toggle();
  });

  /**
   * Event handler for Navigation to Homepage
   */
  $("body").on("click", "#nav-all", async function() {
    hideElements();
    await generateStories();
    $allStoriesList.show();
  });

  /**
   * A rendering function to run to reset the forms and hide the login info
   */
  async function loginAndSubmitForm() {
    // hide the forms for logging in and signing up
    $loginForm.hide();
    $createAccountForm.hide();

    // reset those forms
    $loginForm.trigger("reset");
    $createAccountForm.trigger("reset");

    //reset stories to show favorites.
    await generateStories()

    //Populate favorites HTML
    addFavoritedArticles(user.favorites);

    // show the stories
    $allStoriesList.show();

    // update the navigation bar
    showNavForLoggedInUser();
    $createStoryButton.show();
    $favoriteButton.show();
  }

  /**
   * A rendering function to call the StoryList.getStories static method,
   *  which will generate a storyListInstance.
   *  Then render it
   */
  async function generateStories() {
    // get an instance of StoryList
    const storyListInstance = await StoryList.getStories();
    // update our global variable
    storyList = storyListInstance;
    // empty out that part of the page
    $allStoriesList.empty();

    // loop through all of our stories and generate HTML for them
    storyList.stories.forEach(function(story) {
      const result = generateStoryHTML(story);
      $allStoriesList.append(result);
    });
  }

  /**
   * A function to render HTML for an individual Story instance
   */

  function generateStoryHTML(story) {
    let hostName = getHostName(story.url);

    let favIcon = '<i class="far fa-grin-stars fa-lg"></i>';
  // Checks storyids against user favorites and creates HTML with
  // solid favorite icon.
    if (LOGGED_IN){
      for (let i = 0; i < user.favorites.length; i++){
        if(user.favorites[i].storyId === story.storyId){
          favIcon = '<i class="fas fa-grin-stars fa-lg"></i>';
        }
      }
    };

    // render story markup
    const storyMarkup = $(
      `<li id="${story.storyId}">
          ${favIcon}
          <a class="article-link" href="${story.url}" target="a_blank">
              <strong>${story.title}</strong>
           </a>
          <small class="article-author">by ${story.author}</small>
          <small class="article-hostname ${hostName}">(${hostName})</small>
          <small class="article-username">posted by ${story.username}</small>
       </li>`
    );

    return storyMarkup;
  }

  // Populates HTML favorites list from existing user.favorites
  function addFavoritedArticles(favArr){
    favArr.forEach(function(article){
      $favoriteList.append(generateStoryHTML(article));
    })
  }

  // Sets a favorite by changing icon to solid, adding story id to user on server.
  // updates user instance with recently favorited article. appends most recent favorite to 
  // DOM 
  $("ol").on("click", ".far", async function addFavorite(e){
    if (LOGGED_IN){
      let storyId = e.target.parentElement.id;
      let response = await user.addFavorite(user, storyId);
      // update user instance with current favorites
      user.favorites = response.user.favorites;
      let story = user.favorites[user.favorites.length-1];
      // add favorited article to DOM
      $favoriteList.append(generateStoryHTML(story));
      $(e.target).toggleClass("fas far");
    }
  })

  /* Removes favorites from favorites list */
  $("ol").on("click", ".fas", async function removeFavorite(e){
    if (LOGGED_IN){
      let storyId = e.target.parentElement.id;
      let response = await user.removeFavorite(user, storyId);
      let toBeCleared = $(`#favorited-articles>#${storyId}`)
      user.favorites = response.user.favorites;
      toBeCleared.remove();
      $(e.target).toggleClass("far fas");
    }
  })

  $("#nav-favorites").on("click", function showFavorites(e){
    $("#favorited-articles").show();
    $allStoriesList.toggle();
  })

  // hide all elements in elementsArr
  function hideElements() {
    const elementsArr = [
      $submitForm,
      $allStoriesList,
      $filteredArticles,
      $ownStories,
      $loginForm,
      $createAccountForm
    ];
    elementsArr.forEach(val => val.hide());
  }

  function showNavForLoggedInUser() {
    $navLogin.hide();
    $navLogOut.show();
  }

  // simple function to pull the hostname from a URL
  function getHostName(url) {
    let hostName;
    if (url.indexOf("://") > -1) {
      hostName = url.split("/")[2];
    } else {
      hostName = url.split("/")[0];
    }
    if (hostName.slice(0, 4) === "www.") {
      hostName = hostName.slice(4);
    }
    return hostName;
  }
});
