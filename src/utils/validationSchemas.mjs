import { body } from "express-validator";

export const createUserValidationSchema = {
    username: {
        in: ["body"],
        isString: true,
        trim: true,
        notEmpty: { errorMessage: "Username is required" },
    },
    displayname: {
        in: ["body"],
        optional: true,
        isString: true,
        trim: true,
    },
    email: {
        in: ["body"],
        isEmail: true,
        errorMessage: "Invalid email",
    },
    password: {
        in: ["body"],
        isLength: {
            options: { min: 6 },
            errorMessage: "Password must be at least 6 characters long",
        },
    },
    bio: {
        in: ["body"],
        optional: true,
        isString: true,
        trim: true,
    },
    phone: {
        in: ["body"],
        optional: true,
        isMobilePhone: { options: ["any"], errorMessage: "Invalid phone number" },
    },
    website: {
        in: ["body"],
        optional: true,
        isURL: { errorMessage: "Invalid website URL" },
    },
    gender: {
        in: ["body"],
        optional: true,
        isString: true,
        trim: true,
    },
    country: {
        in: ["body"],
        optional: true,
        isString: true,
        trim: true,
    },
    city: {
        in: ["body"],
        optional: true,
        isString: true,
        trim: true,
    },
    zipCode: {
        in: ["body"],
        optional: true,
        isPostalCode: { options: ["any"], errorMessage: "Invalid zip code" },
    },
    birthdate: {
        in: ["body"],
        custom: {
            options: (value) => {
                if (!value) throw new Error("Birthdate is required");

                // Allow both Date objects and ISO 8601 strings
                if (!(value instanceof Date) && isNaN(Date.parse(value))) {
                    throw new Error("Invalid date format (must be YYYY-MM-DD or a valid Date object)");
                }

                return true;
            },
        },
        toDate: true, 
    },
    profilePicture: {
        in: ["body"],
        optional: true,
        isURL: { errorMessage: "Invalid profile picture URL" },
    },
    profileBanner: {
      in: ["body"],
      optional: true,
      isURL: { errorMessage: "Invalid profile banner URL" },
    },
};



// validationSchemas.mjs - Updated updateUserValidationSchema
export const updateUserValidationSchema = {
  username: {
    in: ["body"],
    isString: true,
    trim: true,
    optional: { options: { nullable: true } },
    isLength: {
      options: { min: 3 }, // Changed from 6 to 3 to match your frontend validation
      errorMessage: "Username must be at least 3 characters long",
    },
    custom: {
      options: (value) => {
        if (value === "") {
          throw new Error("Username cannot be empty");
        }
        return true;
      },
    },
  },
  displayname: {
    in: ["body"],
    isString: true,
    trim: true,
    optional: { options: { nullable: true } },
  },
  email: {
    in: ["body"],
    isEmail: true,
    normalizeEmail: true,
    optional: { options: { nullable: true } },
    errorMessage: "Invalid email",
    custom: {
      options: (value) => {
        if (value === "") {
          throw new Error("Email cannot be empty");
        }
        return true;
      },
    },
  },
  phone: {
    in: ["body"],
    optional: { options: { nullable: true } },
    isMobilePhone: { 
      options: ["any"], 
      errorMessage: "Invalid phone number",
      if: (value) => value && value.length > 0
    },
  },
  website: {
    in: ["body"],
    optional: { options: { nullable: true } },
    isURL: { 
      errorMessage: "Invalid website URL",
      if: (value) => value && value.length > 0
    },
  },
  bio: {
    in: ["body"],
    optional: { options: { nullable: true } },
    isString: true,
    trim: true,
  },
  birthdate: {
    in: ["body"],
    optional: { options: { nullable: true } },
    isISO8601: { 
      errorMessage: "Invalid date format for birthdate",
      if: (value) => value && value.length > 0
    },
  },
  gender: {
    in: ["body"],
    optional: { options: { nullable: true } },
    isString: true,
    trim: true,
  },
  country: {
    in: ["body"],
    optional: { options: { nullable: true } },
    isString: true,
    trim: true,
  },
  city: {
    in: ["body"],
    optional: { options: { nullable: true } },
    isString: true,
    trim: true,
  },
  zipCode: {
    in: ["body"],
    optional: { options: { nullable: true } },
    isPostalCode: { 
      options: ["any"], 
      errorMessage: "Invalid zip code",
      if: (value) => value && value.length > 0
    },
  },
  profilePicture: {
    optional: true,
    isURL: {
        errorMessage: 'profilePicture must be a valid URL'
    }
  },
  profileBanner: {
      optional: true,
      isURL: {
          errorMessage: 'profileBanner must be a valid URL'
      }
  }
};


export const createArticleValidationSchema = {
  title: {
    in: ['body'],
    isString: true,
    notEmpty: true,
    errorMessage: 'Title is required'
  },
  description: {
    in: ['body'],
    isString: true,
    optional: true,
    errorMessage: 'Description is required'
  },
  content: {
    in: ['body'],
    isString: true,
    notEmpty: true,
    errorMessage: 'Content is required'
  },
  category: {
    in: ['body'],
    isString: true,
    notEmpty: true,
    errorMessage: 'Category is required'
  },
  mediaType: {
    in: ['body'],
    isString: true,
    optional: true,
    isIn: {
      options: [['','image', 'video']],
      errorMessage: 'Media type must be either image or video'
    }
  },
  mediaUrl: {
    in: ['body'],
    isString: true,
    optional: true
  },
  status: {
    in: ['body'],
    isString: true,
    optional: true,
    isIn: {
      options: [['on-going', 'approved', 'rejected']],
      errorMessage: 'Invalid status value'
    }
  },
  sources: {
    optional: true,
    isArray: true,
    errorMessage: 'Sources must be an array'
  },
  'sources.*.key': {
    optional: true,
    isString: true,
    isIn: {
      options: [['url', 'video', 'article', 'book', 'other']],
      errorMessage: 'Invalid source kind'
    }
  },
  'sources.*.value': {
    optional: true,
    isString: true
  }
};