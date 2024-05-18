export const asyncHandler = (requestHandler) => (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next))
    .catch(err => next(err))
}


// -------------another approach---------------

// const asyncHandler = (fn) => async (req, res, next) => {
//     try {
//         await fn(req, res, next);
//     } catch (error) {
//         res.status(500).json({
//             success: false,
//             message: "L. Server got issues lol"
//         })
//     }
// }