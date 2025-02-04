export const createUserValidationSchema = {
    username: {
        isLength: {
            options: {
                min: 5,
                max: 32,
            },
            errorMessage:
                "username must be between 5 and 32 characters",
        },
        notEmpty: {
            errorMessage: "username must not be empty",
        },
        isString: {
            errorMessage: "username must be a string",
        },
    },
    displayname: {
        notEmpty: true,
    },
    password: {
        notEmpty: true,
    },
};