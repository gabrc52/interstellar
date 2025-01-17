require("dotenv").config();
const User = require("./models/user");
const Page = require("./models/page");

const { check, validationResult } = require("express-validator/check");

const axios = require("axios");

function logout(req, res) {
  req.session.user = null;
  res.send({});
}

function populateCurrentUser(req, res, next) {
  // simply populate "req.user" for convenience
  req.user = req.session.user;
  next();
}

function ensureLoggedIn(req, res, next) {
  if (!req.user) {
    return res.status(401).send({ err: "not logged in" });
  }

  next();
}

const fetchUserInfo = async (code) => {
  try {
    let data = await axios({
      url: process.env.FIREROAD_LINK + `fetch_token/?code=${code}`,
    });
    data = data.data;
    const accessToken = data.access_info.access_token;
    const email = data.access_info.academic_id;
    const kerb = email.split('@')[0];

    let userData = await axios({
      url: process.env.FIREROAD_LINK + "user_info",
      headers: { Authorization: "Bearer " + accessToken },
    });
    userData = userData.data;

    let name = userData.name;

    // If there's credentials for the people API, query the user there
    // in order to get their name from there, as it is more likely to be correct.
    if (process.env.MULESOFT_CLIENT_ID && process.env.MULESOFT_CLIENT_SECRET) {
      const peopleApiResult = await axios({
        url: "https://mit-people-v3.cloudhub.io/people/v3/people/" + kerb,
        headers: {
          client_id: process.env.MULESOFT_CLIENT_ID,
          client_secret: process.env.MULESOFT_CLIENT_SECRET,
        },
      });
      // The request may fail, for instance, 400 is returned for directory-suppressed students
      if (peopleApiResult.status === 200) {
        name = peopleApiResult.data.item.displayName;
      }
    } else {
      console.log(`Warning: Mulesoft credentials not provided, so Fireroad names are being used. See https://github.com/venkatesh-sivaraman/fireroad-server/pull/55`);
    }

    return { name, email, accessToken };
  } catch (e) {
    console.log(e);
  }
  return {};
};

const signUpLogin = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      errors: errors.array(),
    });
  }

  const { code } = req.query;

  const { name, email, accessToken } = await fetchUserInfo(code);
  try {
    let user = await User.findOne({
      email: email,
    });
    if (user) {
      user.accessToken = accessToken;
      user.name = name;
      console.log(`${name} logged in`);
      user.save().then((user) => {
        req.session.user = user;
        return res.redirect("/redirect");
      });
    } else {
      user = new User({
        name: name,
        email: email,
        accessToken: accessToken,
        isVerified: true,
      });
      console.log(`${name} registered`);
      await user.save(function(err) {
        if (err) {
          console.log(err.message);
          return res.status(500).send({ msg: err.message });
        }
      });

      req.session.user = user;
      return res.redirect("/redirect");
    }
  } catch (err) {
    console.log(err.message);
    res.status(500).send({ msg: "Error in Saving" });
  }
};

async function signContract(req, res) {
  let semesterTypes = ["fall", "iap", "spring"];
  try {
    User.findById(req.user._id).then(async (user) => {
      user.signedContract = true;
      user.classYear = req.body.classYear;

      if (!req.body.importClasses) {
        return user.save().then((user) => {
          res.send({ user });
        });
      }
      //console.log(req.body);
      let id = req.body.roadId || undefined;
      if (id) {
        let road = await axios({
          url: process.env.FIREROAD_LINK + `sync/roads/?id=${id}`,
          headers: { Authorization: "Bearer " + req.user.accessToken },
        });
        let contents = road.data.file.contents;
        // console.log(contents);
        await Promise.all(
          contents.selectedSubjects.map(async (subject) => {
            try {
              const page = await Page.findOne({
                pageType: "Class",
                name: subject.id || subject.subject_id,
              });
              if (!page) {
                console.log(subject);
                return;
              }
              let isUserPage = user.pageIds.find((element) => {
                return element.pageId == page._id;
              });
              if (!isUserPage) {
                const semesterType = semesterTypes[(subject.semester + 2) % 3];
                const year =
                  Number(req.body.classYear) - 4 + Math.floor((subject.semester + 1) / 3);
                const semester = subject.semester === 0 ? "prereq" : `${semesterType}-${year}`;
                user.pageIds.push({
                  pageId: page._id + "",
                  semester: semester,
                });
              }
              return page;
            } catch (err) {
              console.log(err.message);
              return;
            }
          })
        );
        // console.log(user);
        user.markModified("pageIds");
        user.save().then((user) => {
          res.send({ user });
        });
      } else {
        user.save().then((user) => {
          res.send({ user });
        });
      }
    });
  } catch (err) {
    console.log(err.message);
    res.status(500).send({ msg: "Error in signing contract" });
  }
}

module.exports = {
  logout,
  populateCurrentUser,
  ensureLoggedIn,
  signUpLogin,
  signContract,
};
