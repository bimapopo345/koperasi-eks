import Joi from "joi";

export const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.body
      ? schema.body.validate(req.body, { abortEarly: false })
      : Joi.object().validate(req.body);

    if (error) {
      const errors = error.details.reduce((acc, curr) => {
        acc[curr.path[0]] = curr.message;
        return acc;
      }, {});

      return res.status(400).json({
        success: false,
        message: "Validasi gagal",
        errors,
      });
    }

    // Validate params if schema exists
    if (schema.params) {
      const { error: paramsError } = schema.params.validate(req.params, {
        abortEarly: false,
      });

      if (paramsError) {
        const errors = paramsError.details.reduce((acc, curr) => {
          acc[curr.path[0]] = curr.message;
          return acc;
        }, {});

        return res.status(400).json({
          success: false,
          message: "Validasi parameter gagal",
          errors,
        });
      }
    }

    // Validate query if schema exists
    if (schema.query) {
      const { error: queryError } = schema.query.validate(req.query, {
        abortEarly: false,
      });

      if (queryError) {
        const errors = queryError.details.reduce((acc, curr) => {
          acc[curr.path[0]] = curr.message;
          return acc;
        }, {});

        return res.status(400).json({
          success: false,
          message: "Validasi query gagal",
          errors,
        });
      }
    }

    next();
  };
};
