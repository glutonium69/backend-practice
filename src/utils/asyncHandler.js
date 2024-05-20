// the reason why we use such wrapper is so everytime we need to work with async operations we dont have to wrap it in a try catch block or use then catch to handle error. we can wrap it in  this and this will handle the error for us

export const asyncHandler = (requestHandler) => (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next))
    .catch(err => next(err))
}


// -------------another approach---------------

// const asyncHandler = (fn) => async (req, res, next) => {
//     try {
//         await fn(req, res, next);
//     } catch (error) {
//         next(error);
//     }
// }