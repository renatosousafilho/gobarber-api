import Notification from '../schemas/Notification';
import User from '../models/User';

class NotificationController {
    async index(req, res) { 
        // check if user logged if provider
        const checkUserProvider = await User.findOne({
            where: { id: req.userId, provider: true }
        })

        if (!checkUserProvider) {
            return res.status(401).json({error: 'Only providers can load notifications'})
        } 

        const notifications = await Notification.find({
            user: req.userId
        }).sort({ createdAt: 'desc' }).limit(20);

        res.json(notifications);
    }
}

export default new NotificationController();