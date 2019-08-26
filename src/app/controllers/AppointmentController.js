import * as Yup from 'yup';
import { startOfHour, parseISO, isBefore } from 'date-fns';
import User from '../models/User';
import Appointment from '../models/Appointment';

class AppointmentController {
    async store(req, res) {
        const schema = Yup.object().shape({
            provider_id: Yup.number().required("Provider id is required"),
            date: Yup.date().required("Date is required")
        });

        if (!(await schema.isValid(req.body))) {
            return res.status(401).json({error: 'Validation fails'})
        }

        const { provider_id, date } = req.body;

        // check if provider_id is from valid provider

        const isProvider = await User.findOne({
            where: { id: provider_id, provider: true }
        })

        if (!isProvider) {
            return res.status(400).json({error: 'You can only create appointments with providers'});
        }

        // check for past dates
        const hourStart = startOfHour(parseISO(date));

        if (isBefore(hourStart, new Date())) {
            return res.status(400).json({ error: 'Past dates are not permitted!'})
        }

        // check avaliability
        const checkAviability = await Appointment.findOne({
            where: {
                provider_id,
                canceled_at: null,
                date: hourStart
            }
        });

        if (checkAviability) {
            return res.status(400).json({ error: 'Appointment date is not avaliable'})
        }


        const appointment = await Appointment.create({
            user_id: req.userId,
            provider_id,
            date
        })

        res.json(appointment);
    }
}

export default new AppointmentController();