const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const {UserInputError} = require('apollo-server')

const { validateRegisterInput, validateLoginInput } = require('../../util/validator')
const User = require('../../models/User')
const { SECRET_KEY } = require('../../config')
const Profile = require('../../models/Profile')

const generateToken = (user) =>{
    return jwt.sign(
        {
        id: user.id,
        email: user.email,
        username: user.username
    },
    SECRET_KEY,
    { expiresIn: '1h' }
    );
}

module.exports = {
    Mutation: {
        async login(_, { username, password }) {
            const { errors, valid } = validateLoginInput(username, password);

            if (!valid) {
                throw new UserInputError('Errors', { errors });
            }

            const user = await User.findOne({ username });
            
            if (!user) {
                errors.general = 'User not found';
                throw new UserInputError('User not found', { errors });
            }

            const match = await bcrypt.compare(password, user.password);
            if (!match) {
                errors.general = 'Wrong credentials';
                throw new UserInputError('Wrong credentials', { errors });
            }

            const token = generateToken(user);

            return {
                ...user._doc,
                id: user._id,
                token
            };
        },
        async register(
            _,
            {
                registerInput: { username, email, password, confirmPassword } 
            }
        ) {
            // Validate user data
            const { valid, errors } = validateRegisterInput(
                username,
                email,
                password,
                confirmPassword
            );
            if (!valid) {
                console.log(errors)
                throw new UserInputError('Errors', { errors });
            }
            // TODO: Make sure user doesnt already exist
            const user = await User.findOne({ username });
            if (user) {
                throw new UserInputError('Username is taken', {
                    errors: {
                        username: 'This username is taken'
                    }
                });
            }
            // hash password and create an auth token
            password = await bcrypt.hash(password, 12);

            const newUser = new User({
                email,
                username,
                password,
                createdAt: new Date().toISOString()
            });

            const res = await newUser.save();

            const newProfile = new Profile({
                username,
                dob: false,
                mobile: false,
                pic: false,
                gender: false,
                joinedAt: new Date().toISOString()
            })

            await newProfile.save()

            const token = generateToken(res);

            return {
                ...res._doc,
                id: res._id,
                token
            };
        } 
    }
};