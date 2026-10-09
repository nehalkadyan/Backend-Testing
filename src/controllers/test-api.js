const axios = require("axios")

// function to get users from an external api

const getUsersFromThirdPartAPi = async (req, res) => {
    try {
        const response = await axios.get("https://jsonplaceholder.typicode.com/users")

        return res.status(200).json({ message: "Data fetched from third party api", result: response.data })
    } catch (err) {
        console.log("err", err)
    }
}

module.exports = { getUsersFromThirdPartAPi }