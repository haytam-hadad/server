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
        normalizeEmail: true,
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
};


export const createArticleValidationSchema = {
    title: {
      in: ["body"],
      isString: true,
      notEmpty: { errorMessage: "Title is required" },
      isLength: { options: { min: 15 }, errorMessage: "Title must be at least 15 characters long" },
    },
    content: {
      in: ["body"],
      isString: true,
      notEmpty: { errorMessage: "Content is required" },
      isLength: { options: { min: 10 }, errorMessage: "Content must be at least 10 characters long" },
    },
    authorusername: {
      in: ["body"],
      optional: true, // Make optional since we set it from session
      isString: true,
    },
    authordisplayname: {
      in: ["body"],
      optional: true, // Make optional since we set it from session
      isString: true,
    },
    category: {
      in: ["body"],
      isString: true,
      notEmpty: { errorMessage: "Category is required" },
    },
    publishedAt: {
      in: ["body"],
      optional: true,
      isISO8601: { errorMessage: "Invalid date format for publishedAt" },
    },
    views: {
      in: ["body"],
      optional: true,
      isInt: { options: { min: 0 }, errorMessage: "Views must be a non-negative integer" },
    },
    likes: {
      in: ["body"],
      optional: true,
      isInt: { options: { min: 0 }, errorMessage: "Likes must be a non-negative integer" },
    },
    imageUrl: {
      in: ["body"],
      optional: true,
      isURL: { errorMessage: "Invalid article picture URL" },
    },
    status: {
      in: ["body"],
      isString: true,
      notEmpty: { errorMessage: "Status is required" },
      isIn: {
        options: [["on-going", "approved", "rejected"]],
        errorMessage: "Status must be one of: 'on-going', 'approved', or 'rejected'",
      },
    },
    source: {
      in: ["body"],
      optional: true,
      isObject: { errorMessage: "Source must be an object with type and url" },
      custom: {
        options: (value) => {
          if (!value.type) {
            throw new Error("Source type is required");
          }
          if (!["video", "article", "book", "other"].includes(value.type)) {
            throw new Error("Source type must be 'video', 'article', 'book', or 'other'");
          }
          if (!value.url) {
            throw new Error("Source URL is required");
          }
          return true;
        },
      },
    },
};